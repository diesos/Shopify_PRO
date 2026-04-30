<?php

namespace App\Tests\Api;

use App\Entity\Reservation;
use Symfony\Component\HttpFoundation\Response;

final class ReservationApiTest extends AbstractApiTestCase
{
    public function testListReservationsRequiresAuth(): void
    {
        static::createClient()->request('GET', '/api/reservations');

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testListReservationsAsClient(): void
    {
        $this->createUser('jean@test.com');

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('GET', '/api/reservations');

        $this->assertResponseIsSuccessful();
    }

    public function testCreateReservationRequiresAuth(): void
    {
        static::createClient()->request('POST', '/api/reservations', [
            'headers' => ['Content-Type' => 'application/ld+json'],
            'json' => $this->payload(),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testCreateReservationAsClient(): void
    {
        $this->createUser('jean@test.com');

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('POST', '/api/reservations', [
            'headers' => ['Content-Type' => 'application/ld+json'],
            'json' => $this->payload(),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);
        $this->assertJsonContains(['userId' => 1, 'seanceId' => 1]);
    }

    public function testDeleteReservation(): void
    {
        $this->createUser('jean@test.com');

        $reservation = (new Reservation())
            ->setUserId(1)
            ->setSeanceId(1)
            ->setReservationTime(new \DateTime('2026-05-15T09:00:00+02:00'));
        $this->em->persist($reservation);
        $this->em->flush();

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('DELETE', '/api/reservations/'.$reservation->getId());

        $this->assertResponseStatusCodeSame(Response::HTTP_NO_CONTENT);
    }

    private function payload(): array
    {
        return [
            'userId' => 1,
            'seanceId' => 1,
            'reservationTime' => '2026-05-15T09:00:00+02:00',
        ];
    }
}
