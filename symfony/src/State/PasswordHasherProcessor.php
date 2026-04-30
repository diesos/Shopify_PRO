<?php

namespace App\State;

use ApiPlatform\Metadata\DeleteOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\Coach;
use App\Entity\User;
use App\Repository\RoleRepository;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;

/**
 * Hashe les mots de passe au moment du POST/PATCH sur les entités auth.
 *
 * Cas particulier : quand un admin crée un Coach via POST /api/coaches, on
 * crée aussi un User correspondant (même email + même mot de passe) avec
 * ROLE_COACH. Sans ça le coach ne peut pas se connecter, parce que Lexik
 * authentifie contre la table User et pas contre Coach.
 */
final readonly class PasswordHasherProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        #[Autowire(service: 'api_platform.doctrine.orm.state.remove_processor')]
        private ProcessorInterface $removeProcessor,
        private UserPasswordHasherInterface $passwordHasher,
        private RoleRepository $roleRepository,
        private UserRepository $userRepository,
        private EntityManagerInterface $em,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($operation instanceof DeleteOperationInterface) {
            return $this->removeProcessor->process($data, $operation, $uriVariables, $context);
        }

        // Avant tout : si c'est un Coach et qu'on a un mot de passe en clair, on
        // synchronise un User parallèle qui servira au login. On le fait AVANT
        // de hasher le password sur le Coach pour réutiliser la valeur en clair.
        if ($data instanceof Coach && $data->getPassword()) {
            $this->syncCoachAsUser($data, $data->getPassword());
        }

        // Hash du mot de passe sur l'entité auth elle-même (User ou Coach)
        if ($data instanceof PasswordAuthenticatedUserInterface && $data->getPassword() && method_exists($data, 'setPassword')) {
            $data->setPassword($this->passwordHasher->hashPassword($data, $data->getPassword()));
        }

        // Au POST d'un User sans rôle explicite, on attache ROLE_CLIENT
        if ($data instanceof User && $operation instanceof Post && $data->getUserRoles()->isEmpty()) {
            $clientRole = $this->roleRepository->findOneBy(['name' => 'ROLE_CLIENT']);
            if ($clientRole) {
                $data->addUserRole($clientRole);
            }
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }

    /**
     * Crée (ou met à jour) un User miroir pour un Coach donné, avec ROLE_COACH.
     * Le User partage email/firstName/lastName, et reçoit son propre hash du même
     * mot de passe en clair que celui du Coach.
     */
    private function syncCoachAsUser(Coach $coach, string $plainPassword): void
    {
        $user = $this->userRepository->findOneBy(['email' => $coach->getEmail()]);

        if (!$user) {
            $user = new User();
            $user->setEmail($coach->getEmail());
            $user->setFirstName($coach->getFirstName() ?? '');
            $user->setLastName($coach->getLastName() ?? '');
        } else {
            // En cas d'update : on resync les noms si modifiés
            if ($coach->getFirstName()) {
                $user->setFirstName($coach->getFirstName());
            }
            if ($coach->getLastName()) {
                $user->setLastName($coach->getLastName());
            }
        }

        $user->setPassword($this->passwordHasher->hashPassword($user, $plainPassword));

        $coachRole = $this->roleRepository->findOneBy(['name' => 'ROLE_COACH']);
        if ($coachRole && !$user->getUserRoles()->contains($coachRole)) {
            $user->addUserRole($coachRole);
        }

        $this->em->persist($user);
        // Le flush est déclenché par le persistProcessor qui suit, on profite de la même transaction.
    }
}
