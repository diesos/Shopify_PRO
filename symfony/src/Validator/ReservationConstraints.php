<?php

namespace App\Validator;

use Symfony\Component\Validator\Constraint;

#[\Attribute(\Attribute::TARGET_CLASS)]
class ReservationConstraints extends Constraint
{
    public string $seanceFull = 'La séance est complète, plus de places disponibles.';
    public string $userConflict = 'Vous avez déjà une réservation sur ce créneau.';

    public function getTargets(): string|array
    {
        return self::CLASS_CONSTRAINT;
    }
}
