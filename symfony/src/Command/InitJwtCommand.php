<?php

declare(strict_types=1);

namespace App\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\Process\Process;

/**
 * Bootstrap des secrets JWT en une seule commande :
 *
 *   1. Génère une passphrase aléatoire (64 chars hex)
 *   2. L'écrit dans .env.local (fichier non versionné, créé si absent)
 *   3. Délègue à `lexik:jwt:generate-keypair` (sous-process pour qu'il
 *      relise .env.local fraîchement écrit) pour générer les clés RSA
 *      private.pem / public.pem chiffrées avec cette passphrase.
 *
 * Idempotent : si .env.local contient déjà une JWT_PASSPHRASE, on la
 * réutilise (et on génère juste les clés si elles manquent). `--force`
 * regénère tout (et invalide les anciens JWT).
 */
#[AsCommand(
    name: 'app:init-jwt',
    description: 'Génère .env.local avec une passphrase aléatoire et les clés RSA Lexik JWT.',
)]
final class InitJwtCommand extends Command
{
    public function __construct(
        #[Autowire('%kernel.project_dir%')]
        private readonly string $projectDir,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('force', 'f', InputOption::VALUE_NONE, 'Régénère passphrase + clés même s\'ils existent (invalide tous les JWT existants).');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Init JWT · passphrase + clés RSA');

        $force = (bool) $input->getOption('force');
        $fs = new Filesystem();

        $envLocalPath = $this->projectDir . '/.env.local';
        $jwtDir       = $this->projectDir . '/config/jwt';
        $privateKey   = $jwtDir . '/private.pem';
        $publicKey    = $jwtDir . '/public.pem';

        /* ---------- 1. Lire la passphrase existante si présente ---------- */
        $existing = $this->readPassphraseFromEnvLocal($envLocalPath);

        if ($existing && !$force) {
            $io->writeln('  · <fg=green>JWT_PASSPHRASE déjà présente dans .env.local — réutilisée.</>');
            $io->writeln('    (passe <comment>--force</> pour régénérer une nouvelle passphrase et invalider les JWT existants)');
            $passphrase = $existing;
        } else {
            $passphrase = bin2hex(random_bytes(32)); // 64 chars hex
            $this->writePassphraseToEnvLocal($envLocalPath, $passphrase, $fs);
            $io->writeln(sprintf('  · <fg=green>Nouvelle passphrase écrite dans</> <comment>%s</>', $envLocalPath));
        }

        /* ---------- 2. Génération (ou skip) des clés RSA ---------- */
        $keysExist = $fs->exists($privateKey) && $fs->exists($publicKey);

        if ($keysExist && !$force) {
            $io->writeln('  · <fg=green>Clés JWT déjà présentes</> dans config/jwt/ — pas de régénération.');
            $io->writeln('    (passe <comment>--force</> pour les écraser)');
        } else {
            if ($keysExist) {
                // Force : on supprime les .pem existants pour que generate-keypair les recrée
                $fs->remove([$privateKey, $publicKey]);
                $io->writeln('  · Anciennes clés supprimées (mode --force).');
            }
            $io->writeln('  · Génération des clés RSA via <comment>lexik:jwt:generate-keypair</>…');
            $exitCode = $this->runLexikKeypair($io);
            if ($exitCode !== 0) {
                $io->error('Échec de la génération des clés.');
                return Command::FAILURE;
            }
        }

        /* ---------- 3. Récap ---------- */
        $io->newLine();
        $io->success('JWT prêt à l\'usage.');
        $io->writeln('Fichiers générés :');
        $io->writeln(sprintf('  · <comment>%s</>  (clé privée chiffrée)', $privateKey));
        $io->writeln(sprintf('  · <comment>%s</>  (clé publique)', $publicKey));
        $io->writeln(sprintf('  · <comment>%s</>  (passphrase)', $envLocalPath));
        $io->newLine();
        $io->note([
            'Le .env.local et les clés .pem sont dans le .gitignore — ils ne seront jamais commités.',
            'À chaque clone du repo, relance simplement : bin/console app:init-jwt',
        ]);

        return Command::SUCCESS;
    }

    /* ============================================================ */

    private function readPassphraseFromEnvLocal(string $path): ?string
    {
        if (!is_file($path)) {
            return null;
        }
        $content = file_get_contents($path) ?: '';
        if (preg_match('/^JWT_PASSPHRASE=(.+)$/m', $content, $m)) {
            $value = trim($m[1]);
            // strip surrounding quotes si présentes
            return trim($value, "\"'") ?: null;
        }
        return null;
    }

    private function writePassphraseToEnvLocal(string $path, string $passphrase, Filesystem $fs): void
    {
        $line = "JWT_PASSPHRASE={$passphrase}";

        if (!$fs->exists($path)) {
            $header = <<<ENV
# Local environment overrides (non versionné — cf .gitignore)
# Généré par `bin/console app:init-jwt`
#
# Ne pas committer. Si tu changes la passphrase, tous les JWT existants seront invalidés.

ENV;
            $fs->dumpFile($path, $header . "\n" . $line . "\n");
            return;
        }

        $content = file_get_contents($path) ?: '';
        if (preg_match('/^JWT_PASSPHRASE=.*$/m', $content)) {
            // Remplacement en place
            $content = preg_replace('/^JWT_PASSPHRASE=.*$/m', $line, $content);
        } else {
            // Ajout en fin de fichier
            $content = rtrim($content) . "\n\n" . $line . "\n";
        }
        $fs->dumpFile($path, $content);
    }

    /**
     * Sous-process pour que `lexik:jwt:generate-keypair` redémarre un kernel
     * frais qui lira le .env.local qu'on vient d'écrire.
     */
    private function runLexikKeypair(SymfonyStyle $io): int
    {
        $process = new Process(
            ['php', 'bin/console', 'lexik:jwt:generate-keypair', '--skip-if-exists', '--no-interaction'],
            $this->projectDir,
        );
        $process->setTimeout(60);
        $process->run(static function (string $type, string $buffer) use ($io): void {
            $io->write($buffer);
        });

        return $process->getExitCode() ?? 1;
    }
}
