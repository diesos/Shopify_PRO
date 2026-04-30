<?php

namespace App\Tests\Api;

use App\Entity\User;
use Symfony\Component\HttpFoundation\Response;

final class UserApiTest extends AbstractApiTestCase
{
    public function testListUsersRequiresAuth(): void
    {
        static::createClient()->request('GET', '/api/users');

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testListUsersAsAdmin(): void
    {
        $this->createUser('admin@test.com', 'admin123', ['ROLE_ADMIN']);
        $this->createUser('jean@test.com');

        $client = $this->authenticatedClient('admin@test.com', 'admin123');
        $client->request('GET', '/api/users');

        $this->assertResponseIsSuccessful();
        $this->assertJsonContains(['@type' => 'Collection']);
    }

    public function testGetUserById(): void
    {
        $user = $this->createUser('jean@test.com');

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('GET', '/api/users/'.$user->getId());

        $this->assertResponseIsSuccessful();
        $this->assertJsonContains(['email' => 'jean@test.com']);
    }

    public function testPatchUser(): void
    {
        $user = $this->createUser('jean@test.com');

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('PATCH', '/api/users/'.$user->getId(), [
            'headers' => ['Content-Type' => 'application/merge-patch+json'],
            'json' => ['firstName' => 'Jean-Pierre'],
        ]);

        $this->assertResponseIsSuccessful();
        $this->assertJsonContains(['firstName' => 'Jean-Pierre']);
    }

    public function testDeleteUserAsAdmin(): void
    {
        $this->createUser('admin@test.com', 'admin123', ['ROLE_ADMIN']);
        $target = $this->createUser('jean@test.com');

        $client = $this->authenticatedClient('admin@test.com', 'admin123');
        $client->request('DELETE', '/api/users/'.$target->getId());

        $this->assertResponseStatusCodeSame(Response::HTTP_NO_CONTENT);
        self::assertNull($this->em->getRepository(User::class)->find($target->getId()));
    }
}
