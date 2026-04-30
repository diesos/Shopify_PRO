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
        $user = $this->createUser('jean@test.com');
        $seance = $this->createSeance();

        static::createClient()->request('POST', '/api/reservations', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->payload($user->getId(), $seance->getId()),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testCreateReservationAsClient(): void
    {
        $user = $this->createUser('jean@test.com');
        $seance = $this->createSeance();

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('POST', '/api/reservations', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->payload($user->getId(), $seance->getId()),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);
    }

    public function testCreateReservationFailsWhenSeanceFull(): void
    {
        $owner = $this->createUser('jean@test.com');
        $other = $this->createUser('paul@test.com');
        $seance = $this->createSeance(maxUser: 1);

        $reservation = (new Reservation())
            ->setUser($other)
            ->setSeance($seance)
            ->setReservationTime(new \DateTime('2026-05-15T09:00:00+02:00'));
        $this->em->persist($reservation);
        $this->em->flush();

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('POST', '/api/reservations', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->payload($owner->getId(), $seance->getId()),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    public function testCreateReservationFailsOnTimeConflict(): void
    {
        $user = $this->createUser('jean@test.com');
        $seanceA = $this->createSeance(maxUser: 10, start: '2026-05-15T09:00:00+02:00', end: '2026-05-15T10:00:00+02:00');
        $seanceB = $this->createSeance(maxUser: 10, start: '2026-05-15T09:30:00+02:00', end: '2026-05-15T10:30:00+02:00');

        $reservation = (new Reservation())
            ->setUser($user)
            ->setSeance($seanceA)
            ->setReservationTime(new \DateTime('2026-05-15T09:00:00+02:00'));
        $this->em->persist($reservation);
        $this->em->flush();

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('POST', '/api/reservations', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->payload($user->getId(), $seanceB->getId()),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    public function testDeleteReservation(): void
    {
        $user = $this->createUser('jean@test.com');
        $seance = $this->createSeance();

        $reservation = (new Reservation())
            ->setUser($user)
            ->setSeance($seance)
            ->setReservationTime(new \DateTime('2026-05-15T09:00:00+02:00'));
        $this->em->persist($reservation);
        $this->em->flush();

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('DELETE', '/api/reservations/'.$reservation->getId());

        $this->assertResponseStatusCodeSame(Response::HTTP_NO_CONTENT);
    }

    public function testDeleteReservationByOtherClientIsForbidden(): void
    {
        $owner = $this->createUser('jean@test.com');
        $this->createUser('paul@test.com');
        $seance = $this->createSeance();

        $reservation = (new Reservation())
            ->setUser($owner)
            ->setSeance($seance)
            ->setReservationTime(new \DateTime('2026-05-15T09:00:00+02:00'));
        $this->em->persist($reservation);
        $this->em->flush();

        $client = $this->authenticatedClient('paul@test.com');
        $client->request('DELETE', '/api/reservations/'.$reservation->getId());

        $this->assertResponseStatusCodeSame(Response::HTTP_FORBIDDEN);
    }

    public function testCreateReservationSucceedsOnAdjacentSeances(): void
    {
        $user = $this->createUser('jean@test.com');
        $seanceA = $this->createSeance(maxUser: 10, start: '2026-05-15T09:00:00+02:00', end: '2026-05-15T10:00:00+02:00');
        $seanceB = $this->createSeance(maxUser: 10, start: '2026-05-15T10:00:00+02:00', end: '2026-05-15T11:00:00+02:00');

        $reservation = (new Reservation())
            ->setUser($user)
            ->setSeance($seanceA)
            ->setReservationTime(new \DateTime('2026-05-15T09:00:00+02:00'));
        $this->em->persist($reservation);
        $this->em->flush();

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('POST', '/api/reservations', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->payload($user->getId(), $seanceB->getId()),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);
    }

    public function testTimeConflictRuleIsPerUser(): void
    {
        $jean = $this->createUser('jean@test.com');
        $paul = $this->createUser('paul@test.com');
        $seanceA = $this->createSeance(maxUser: 10, start: '2026-05-15T09:00:00+02:00', end: '2026-05-15T10:00:00+02:00');
        $seanceB = $this->createSeance(maxUser: 10, start: '2026-05-15T09:30:00+02:00', end: '2026-05-15T10:30:00+02:00');

        $reservation = (new Reservation())
            ->setUser($paul)
            ->setSeance($seanceA)
            ->setReservationTime(new \DateTime('2026-05-15T09:00:00+02:00'));
        $this->em->persist($reservation);
        $this->em->flush();

        $client = $this->authenticatedClient('jean@test.com');
        $client->request('POST', '/api/reservations', [
            'headers' => ['Content-Type' => 'application/json'],
            'json' => $this->payload($jean->getId(), $seanceB->getId()),
        ]);

        $this->assertResponseStatusCodeSame(Response::HTTP_CREATED);
    }

    private function payload(int $userId, int $seanceId): array
    {
        return [
            'user' => '/api/users/'.$userId,
            'seance' => '/api/seances/'.$seanceId,
            'reservationTime' => '2026-05-15T09:00:00+02:00',
        ];
    }
}
