-- Bootstrap des rôles applicatifs
-- À jouer une seule fois après les migrations Doctrine.
--
-- Usage :
--   docker exec -i shopify_db mysql -ushopify_user -pshopify_password shopify_db < symfony/sql/init_roles.sql
--
-- Ou dans le conteneur PHP :
--   docker exec shopify_php php bin/console doctrine:query:sql "$(cat /var/www/symfony/sql/init_roles.sql)"

INSERT INTO role (name, label) VALUES
    ('ROLE_ADMIN',  'Administrateur'),
    ('ROLE_CLIENT', 'Client')
ON DUPLICATE KEY UPDATE label = VALUES(label);
