<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Coach;
use App\Entity\Reservation;
use App\Entity\Role;
use App\Entity\Seance;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Seed des données de démonstration :
 *   · 1 admin
 *   · 5 coachs (entité Coach + User miroir avec ROLE_COACH)
 *   · 5 clients
 *   · 5 séances (1 par coach, dates variées)
 *   · 5 réservations (1 par client → 1 séance)
 *
 * Idempotent : check par email avant création. Relance possible sans risque.
 *
 * Usage :
 *   docker exec shopify_php php bin/console app:seed-dummy
 *   docker exec shopify_php php bin/console app:seed-dummy --fresh   # reset des tables avant seed
 */
#[AsCommand(
    name: 'app:seed-dummy',
    description: 'Insère un jeu de données de démo : 1 admin, 5 coachs, 5 clients, 5 séances, 5 réservations.',
)]
final class SeedDummyCommand extends Command
{
    /** Mot de passe commun à tous les comptes seedés. */
    public const COMMON_PASSWORD = 'azerty123';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('fresh', null, InputOption::VALUE_NONE, 'Vider les tables seance/reservation/coach/user avant seed.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Seed Sportify Pro · données de démo');

        if ($input->getOption('fresh')) {
            $this->wipe($io);
        }

        /* ---- Rôles (idempotent) ---- */
        $roleRepo   = $this->em->getRepository(Role::class);
        $roleAdmin  = $roleRepo->findOneBy(['name' => 'ROLE_ADMIN'])  ?? $this->createRole('ROLE_ADMIN', 'Administrateur');
        $roleCoach  = $roleRepo->findOneBy(['name' => 'ROLE_COACH'])  ?? $this->createRole('ROLE_COACH', 'Coach');
        $roleClient = $roleRepo->findOneBy(['name' => 'ROLE_CLIENT']) ?? $this->createRole('ROLE_CLIENT', 'Client');
        $this->em->flush();

        /* ---- 1 Admin ---- */
        $io->section('1 admin');
        $admin = $this->ensureUser('admin@sportify.fr', 'Alice', 'Admin', [$roleAdmin, $roleClient]);
        $io->writeln('  · admin@sportify.fr');

        /* ---- 5 Coaches ---- */
        $io->section('5 coachs');
        $coachSpecs = [
            ['Camille', 'Lavoie',   'camille@coach.fr',  '0612345678', 65],
            ['Théo',    'Marchand', 'theo@coach.fr',     '0623456789', 80],
            ['Inès',    'Belkacem', 'ines@coach.fr',     '0634567890', 75],
            ['Hugo',    'Renard',   'hugo@coach.fr',     '0645678901', 55],
            ['Sarah',   'Nguyen',   'sarah@coach.fr',    '0656789012', 70],
        ];
        $coaches = [];
        foreach ($coachSpecs as [$first, $last, $email, $phone, $price]) {
            // 1) un User miroir avec ROLE_COACH (sert au login Lexik)
            $this->ensureUser($email, $first, $last, [$roleCoach, $roleClient]);
            // 2) l'entité Coach (champs métier)
            $coaches[] = $this->ensureCoach($email, $first, $last, $phone, $price);
            $io->writeln(sprintf('  · %-10s %-10s %s · %d €/h', $first, $last, $email, $price));
        }

        /* ---- 5 Clients ---- */
        $io->section('5 clients');
        $clientSpecs = [
            ['Léa',     'Moreau',  'lea@client.fr'],
            ['Antoine', 'Roche',   'antoine@client.fr'],
            ['Marie',   'Dubois',  'marie@client.fr'],
            ['Yanis',   'Tahiri',  'yanis@client.fr'],
            ['Élodie',  'Faure',   'elodie@client.fr'],
        ];
        $clients = [];
        foreach ($clientSpecs as [$first, $last, $email]) {
            $clients[] = $this->ensureUser($email, $first, $last, [$roleClient]);
            $io->writeln(sprintf('  · %-10s %-10s %s', $first, $last, $email));
        }

        /* ---- 5 Séances (1 par coach, dates variées) ---- */
        $io->section('5 séances');
        $now = new \DateTime();
        // [name, coachIdx, maxUser, jours offset, hour, durationMin]
        $seanceSpecs = [
            ['Vinyasa flow matinal',          0, 12, +1,  8, 60],
            ['Force fonctionnelle',           1,  8, +2, 12, 60],
            ['Pilates Reformer · niveau 1',   2,  6, +3, 10, 50],
            ['Sortie longue 12 km',           3, 15, +4,  9, 90],
            ['Boxe technique débutant',       4, 10, +5, 19, 60],
        ];
        $seances = [];
        foreach ($seanceSpecs as [$name, $coachIdx, $max, $dayOffset, $hour, $durMin]) {
            $start = (clone $now)->modify(sprintf('%+d days', $dayOffset))->setTime($hour, 0, 0);
            $end   = (clone $start)->modify(sprintf('+%d minutes', $durMin));
            $seance = $this->ensureSeance($name, $coaches[$coachIdx]->getId(), $max, $start, $end);
            $seances[] = $seance;
            $coach = $coaches[$coachIdx];
            $io->writeln(sprintf('  · %-32s · %s · coach %s %s', $name, $start->format('D d M H:i'), $coach->getFirstName(), $coach->getLastName()));
        }

        /* ---- 5 Réservations (1 client → 1 séance) ---- */
        $io->section('5 réservations');
        $created = 0;
        foreach ($clients as $i => $client) {
            $seance = $seances[$i]; // client #i → séance #i
            if ($this->ensureReservation($client, $seance)) {
                $created++;
            }
            $io->writeln(sprintf('  · %s %s → %s', $client->getFirstName(), $client->getLastName(), $seance->getName()));
        }

        $this->em->flush();

        /* ---- Récapitulatif ---- */
        $io->newLine();
        $io->success(sprintf('Seed terminé · %d réservation%s effectivement créée%s.', $created, $created > 1 ? 's' : '', $created > 1 ? 's' : ''));

        $io->writeln('');
        $io->writeln('<options=bold>Mot de passe commun (tous les comptes) :</> <fg=yellow;options=bold>'.self::COMMON_PASSWORD.'</>');
        $io->writeln('');
        $io->writeln('<options=bold>Comptes pour tester les 3 rôles :</>');
        $io->writeln('  <fg=magenta>ROLE_ADMIN  </>  admin@sportify.fr     '.self::COMMON_PASSWORD);
        $io->writeln('  <fg=cyan>ROLE_COACH  </>  camille@coach.fr      '.self::COMMON_PASSWORD);
        $io->writeln('  <fg=green>ROLE_CLIENT </>  lea@client.fr         '.self::COMMON_PASSWORD);
        $io->writeln('');
        $io->writeln('Autres coachs : theo@coach.fr · ines@coach.fr · hugo@coach.fr · sarah@coach.fr');
        $io->writeln('Autres clients : antoine@client.fr · marie@client.fr · yanis@client.fr · elodie@client.fr');

        return Command::SUCCESS;
    }

    /* ---------------- helpers ---------------- */

    private function createRole(string $name, string $label): Role
    {
        $r = (new Role())->setName($name)->setLabel($label);
        $this->em->persist($r);
        return $r;
    }

    /** @param Role[] $roles */
    private function ensureUser(string $email, string $firstName, string $lastName, array $roles): User
    {
        $existing = $this->em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existing) {
            return $existing;
        }

        $user = (new User())
            ->setEmail($email)
            ->setFirstName($firstName)
            ->setLastName($lastName);
        $user->setPassword($this->hasher->hashPassword($user, self::COMMON_PASSWORD));
        foreach ($roles as $role) {
            $user->addUserRole($role);
        }
        $this->em->persist($user);
        return $user;
    }

    private function ensureCoach(string $email, string $firstName, string $lastName, string $phone, int $price): Coach
    {
        $existing = $this->em->getRepository(Coach::class)->findOneBy(['email' => $email]);
        if ($existing) {
            return $existing;
        }
        $coach = (new Coach())
            ->setEmail($email)
            ->setFirstName($firstName)
            ->setLastName($lastName)
            ->setPhone($phone)
            ->setPricePerHour($price);
        $coach->setPassword($this->hasher->hashPassword($coach, self::COMMON_PASSWORD));
        $this->em->persist($coach);
        return $coach;
    }

    private function ensureSeance(string $name, int $coachId, int $maxUser, \DateTime $start, \DateTime $end): Seance
    {
        $existing = $this->em->getRepository(Seance::class)->findOneBy([
            'name' => $name,
            'startTime' => $start,
        ]);
        if ($existing) {
            return $existing;
        }
        $seance = (new Seance())
            ->setName($name)
            ->setCoachId($coachId)
            ->setMaxUser($maxUser)
            ->setStartTime($start)
            ->setEndTime($end);
        $this->em->persist($seance);
        return $seance;
    }

    private function ensureReservation(User $user, Seance $seance): bool
    {
        $existing = $this->em->getRepository(Reservation::class)->findOneBy([
            'user' => $user,
            'seance' => $seance,
        ]);
        if ($existing) {
            return false;
        }
        $r = (new Reservation())
            ->setUser($user)
            ->setSeance($seance)
            ->setReservationTime(new \DateTime());
        $this->em->persist($r);
        return true;
    }

    private function wipe(SymfonyStyle $io): void
    {
        $io->warning('Mode --fresh : suppression des reservations / seances / coaches / users.');
        $conn = $this->em->getConnection();
        $conn->executeStatement('SET FOREIGN_KEY_CHECKS=0');
        $conn->executeStatement('TRUNCATE TABLE reservation');
        $conn->executeStatement('TRUNCATE TABLE seance');
        $conn->executeStatement('TRUNCATE TABLE coach');
        $conn->executeStatement('DELETE FROM user_role');
        $conn->executeStatement('DELETE FROM user');
        $conn->executeStatement('SET FOREIGN_KEY_CHECKS=1');
    }
}
