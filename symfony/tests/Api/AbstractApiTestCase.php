<?php

namespace App\Tests\Api;

use ApiPlatform\Symfony\Bundle\Test\ApiTestCase;
use ApiPlatform\Symfony\Bundle\Test\Client;
use App\Entity\Role;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

abstract class AbstractApiTestCase extends ApiTestCase
{
    protected EntityManagerInterface $em;

    protected function setUp(): void
    {
        parent::setUp();

        $this->em = static::getContainer()->get('doctrine')->getManager();
        $this->resetDatabase();
        $this->seedRoles();
    }

    protected function resetDatabase(): void
    {
        $metadata = $this->em->getMetadataFactory()->getAllMetadata();
        $tool = new SchemaTool($this->em);
        $tool->dropSchema($metadata);
        $tool->createSchema($metadata);
    }

    protected function seedRoles(): void
    {
        foreach ([
            'ROLE_ADMIN' => 'Administrateur',
            'ROLE_CLIENT' => 'Client',
            'ROLE_COACH' => 'Coach',
        ] as $name => $label) {
            $role = (new Role())->setName($name)->setLabel($label);
            $this->em->persist($role);
        }
        $this->em->flush();
    }

    protected function createUser(string $email, string $plainPassword = 'azerty123', array $roles = ['ROLE_CLIENT']): User
    {
        $hasher = static::getContainer()->get(UserPasswordHasherInterface::class);

        $user = (new User())
            ->setFirstName('Test')
            ->setLastName('User')
            ->setEmail($email);
        $user->setPassword($hasher->hashPassword($user, $plainPassword));

        $repo = $this->em->getRepository(Role::class);
        foreach ($roles as $roleName) {
            if ($role = $repo->findOneBy(['name' => $roleName])) {
                $user->addUserRole($role);
            }
        }

        $this->em->persist($user);
        $this->em->flush();

        return $user;
    }

    protected function login(string $email, string $password = 'azerty123'): string
    {
        $response = static::createClient()->request('POST', '/api/login_check', [
            'json' => ['email' => $email, 'password' => $password],
        ]);
        $this->assertResponseIsSuccessful();

        return $response->toArray()['token'];
    }

    protected function authenticatedClient(string $email, string $password = 'azerty123'): Client
    {
        $token = $this->login($email, $password);

        return static::createClient([], ['headers' => ['Authorization' => 'Bearer '.$token]]);
    }
}
