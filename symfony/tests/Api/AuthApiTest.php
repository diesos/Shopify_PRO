<?php

namespace App\Tests\Api;

use App\Entity\User;
use Symfony\Component\HttpFoundation\Response;

final class AuthApiTest extends AbstractApiTestCase
{
    public function testRegisterCreatesClientUser(): void
    {
        $client = static::createClient();

        $client->request('POST', '/api/users', [
            'headers' => ['Content-Type' => 'application/ld+json'],
            'json' => [
                'firstName' => 'Jean',
                'lastName' => 'Dupont',
                'email' => 'jean@test.com',
                'password' => 'azerty123',
            ],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $this->assertJsonContains([
            'firstName' => 'Jean',
            'lastName' => 'Dupont',
            'email' => 'jean@test.com',
        ]);

        $user = $this->em->getRepository(User::class)->findOneBy(['email' => 'jean@test.com']);
        self::assertNotNull($user);
        self::assertNotSame('azerty123', $user->getPassword(), 'Le password doit être hashé');
        self::assertContains('ROLE_CLIENT', $user->getRoles(), 'ROLE_CLIENT doit être assigné automatiquement');
    }

    public function testRegisterRejectsDuplicateEmail(): void
    {
        $this->createUser('jean@test.com');

        static::createClient()->request('POST', '/api/users', [
            'headers' => ['Content-Type' => 'application/ld+json'],
            'json' => [
                'firstName' => 'Autre',
                'lastName' => 'Jean',
                'email' => 'jean@test.com',
                'password' => 'azerty123',
            ],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    public function testRegisterRejectsInvalidEmail(): void
    {
        static::createClient()->request('POST', '/api/users', [
            'headers' => ['Content-Type' => 'application/ld+json'],
            'json' => [
                'firstName' => 'Jean',
                'lastName' => 'Dupont',
                'email' => 'not-an-email',
                'password' => 'azerty123',
            ],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    public function testRegisterRejectsShortPassword(): void
    {
        static::createClient()->request('POST', '/api/users', [
            'headers' => ['Content-Type' => 'application/ld+json'],
            'json' => [
                'firstName' => 'Jean',
                'lastName' => 'Dupont',
                'email' => 'jean@test.com',
                'password' => '123',
            ],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    public function testLoginReturnsJwtToken(): void
    {
        $this->createUser('jean@test.com', 'azerty123');

        $response = static::createClient()->request('POST', '/api/login_check', [
            'json' => ['email' => 'jean@test.com', 'password' => 'azerty123'],
        ]);

        $this->assertResponseIsSuccessful();
        $data = $response->toArray();
        self::assertArrayHasKey('token', $data);
        self::assertNotEmpty($data['token']);
    }

    public function testLoginAdminReturnsToken(): void
    {
        $this->createUser('admin@test.com', 'admin123', ['ROLE_ADMIN', 'ROLE_CLIENT']);

        $response = static::createClient()->request('POST', '/api/login_check', [
            'json' => ['email' => 'admin@test.com', 'password' => 'admin123'],
        ]);

        $this->assertResponseIsSuccessful();
        self::assertArrayHasKey('token', $response->toArray());
    }

    public function testLoginRejectsWrongPassword(): void
    {
        $this->createUser('jean@test.com', 'azerty123');

        static::createClient()->request('POST', '/api/login_check', [
            'json' => ['email' => 'jean@test.com', 'password' => 'wrong'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testLoginRejectsUnknownEmail(): void
    {
        static::createClient()->request('POST', '/api/login_check', [
            'json' => ['email' => 'ghost@test.com', 'password' => 'whatever'],
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testProtectedRouteRejectsRequestWithoutToken(): void
    {
        static::createClient()->request('GET', '/api/users');

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testProtectedRouteAcceptsValidToken(): void
    {
        $this->createUser('admin@test.com', 'admin123', ['ROLE_ADMIN']);

        $client = $this->authenticatedClient('admin@test.com', 'admin123');
        $client->request('GET', '/api/users');

        $this->assertResponseIsSuccessful();
    }
}
