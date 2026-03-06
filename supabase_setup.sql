-- Script de actualización para la Fase 2 del módulo de Ventas
-- Para ejecutar en la consola SQL de Supabase

-- 1. Añadir la columna de estado para soportar anulaciones y auditoría
ALTER TABLE sales ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cancelled_by uuid; -- O text si guardamos el nombre

-- 2. Asegurarnos que las ventas anteriores consten como completadas y no en Null
UPDATE sales SET status = 'completed' WHERE status IS NULL;

-- 3. (Opcional pero Recomendado) Añadir un check constraint
-- ALTER TABLE sales ADD CONSTRAINT sales_status_check CHECK (status IN ('completed', 'cancelled'));

-- ¡Listo! El sistema ya es compatible con anulaciones y devoluciones de stock en el panel web.
