<?php

namespace App\Tests\Api;

use App\Entity\Role;
use App\Entity\User;
use Symfony\Component\HttpFoundation\Response;

final class RoleApiTest extends AbstractApiTestCase
{
    public function testListRolesRequiresAuth(): void
    {
        static::createClient()->request('GET', '/api/roles');

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testListRolesAsAdmin(): void
    {
        $this->createUser('admin@test.com', 'admin123', ['ROLE_ADMIN']);

        $client = $this->authenticatedClient('admin@test.com', 'admin123');
        $client->request('GET', '/api/roles');

        $this->assertResponseIsSuccessful();
    }

    public function testCreateRole(): void
    {
        $this->createUser('admin@test.com', 'admin123', ['ROLE_ADMIN']);

        $client = $this->authenticatedClient('admin@test.com', 'admin123');
        $client->request('POST', '/api/roles', [
            'headers' => ['Content-Type' => 'application/ld+json'],
            'json' => ['name' => 'ROLE_MANAGER', 'label' => 'Gestionnaire'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $this->assertJsonContains(['name' => 'ROLE_MANAGER', 'label' => 'Gestionnaire']);
    }

    public function testAssignRoleToUserViaPatch(): void
    {
        $this->createUser('admin@test.com', 'admin123', ['ROLE_ADMIN']);
        $target = $this->createUser('jean@test.com');

        $coachRole = $this->em->getRepository(Role::class)->findOneBy(['name' => 'ROLE_COACH']);

        $client = $this->authenticatedClient('admin@test.com', 'admin123');
        $client->request('PATCH', '/api/users/'.$target->getId(), [
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
            'json' => ['userRoles' => ['/api/roles/'.$coachRole->getId()]],
        ]);

        $this->assertResponseIsSuccessful();

        $this->em->clear();
        $reloaded = $this->em->getRepository(User::class)->find($target->getId());
        self::assertContains('ROLE_COACH', $reloaded->getRoles());
    }
}
