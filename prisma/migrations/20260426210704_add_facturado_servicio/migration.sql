-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Seccion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "facturado" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Seccion" ("createdAt", "id", "nombre") SELECT "createdAt", "id", "nombre" FROM "Seccion";
DROP TABLE "Seccion";
ALTER TABLE "new_Seccion" RENAME TO "Seccion";
CREATE UNIQUE INDEX "Seccion_nombre_key" ON "Seccion"("nombre");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
