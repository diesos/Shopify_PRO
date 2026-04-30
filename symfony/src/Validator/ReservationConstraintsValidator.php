<?php

namespace App\Validator;

use App\Entity\Reservation;
use App\Repository\ReservationRepository;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

class ReservationConstraintsValidator extends ConstraintValidator
{
    public function __construct(
        private readonly ReservationRepository $reservationRepository,
    ) {
    }

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof ReservationConstraints) {
            throw new UnexpectedTypeException($constraint, ReservationConstraints::class);
        }

        if (!$value instanceof Reservation) {
            return;
        }

        $seance = $value->getSeance();
        $user = $value->getUser();

        if (!$seance || !$user) {
            return;
        }

        $existingCount = $this->countReservationsForSeance($value);
        if ($seance->getMaxUser() !== null && $existingCount >= $seance->getMaxUser()) {
            $this->context->buildViolation($constraint->seanceFull)
                ->atPath('seance')
                ->addViolation();
        }

        if ($this->hasOverlappingReservation($value)) {
            $this->context->buildViolation($constraint->userConflict)
                ->atPath('seance')
                ->addViolation();
        }
    }

    private function countReservationsForSeance(Reservation $reservation): int
    {
        $qb = $this->reservationRepository->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->where('r.seance = :seance')
            ->setParameter('seance', $reservation->getSeance());

        if ($reservation->getId() !== null) {
            $qb->andWhere('r.id != :id')->setParameter('id', $reservation->getId());
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    private function hasOverlappingReservation(Reservation $reservation): bool
    {
        $seance = $reservation->getSeance();

        $qb = $this->reservationRepository->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->join('r.seance', 's')
            ->where('r.user = :user')
            ->andWhere('s.startTime < :endTime')
            ->andWhere('s.endTime > :startTime')
            ->setParameter('user', $reservation->getUser())
            ->setParameter('startTime', $seance->getStartTime())
            ->setParameter('endTime', $seance->getEndTime());

        if ($reservation->getId() !== null) {
            $qb->andWhere('r.id != :id')->setParameter('id', $reservation->getId());
        }

        return ((int) $qb->getQuery()->getSingleScalarResult()) > 0;
    }
}
