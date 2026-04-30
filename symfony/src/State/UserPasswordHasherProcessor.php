<?php

namespace App\State;

use ApiPlatform\Metadata\DeleteOperationInterface;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use App\Repository\RoleRepository;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final readonly class UserPasswordHasherProcessor implements ProcessorInterface
{
    public function __construct(
        #[Autowire(service: 'api_platform.doctrine.orm.state.persist_processor')]
        private ProcessorInterface $persistProcessor,
        #[Autowire(service: 'api_platform.doctrine.orm.state.remove_processor')]
        private ProcessorInterface $removeProcessor,
        private UserPasswordHasherInterface $passwordHasher,
        private RoleRepository $roleRepository,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($operation instanceof DeleteOperationInterface) {
            return $this->removeProcessor->process($data, $operation, $uriVariables, $context);
        }

        if (!$data instanceof User) {
            return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
        }

        if ($data->getPassword()) {
            $data->setPassword($this->passwordHasher->hashPassword($data, $data->getPassword()));
        }

        if ($operation instanceof Post && $data->getUserRoles()->isEmpty()) {
            $clientRole = $this->roleRepository->findOneBy(['name' => 'ROLE_CLIENT']);
            if ($clientRole) {
                $data->addUserRole($clientRole);
            }
        }

        return $this->persistProcessor->process($data, $operation, $uriVariables, $context);
    }
}
