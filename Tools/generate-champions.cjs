const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");

const CHAMPIONS_DIRECTORY = path.join(
  PROJECT_ROOT,
  "assets",
  "champions"
);

const OUTPUT_FILE = path.join(
  PROJECT_ROOT,
  "js",
  "data",
  "champions.js"
);

const VALID_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp"
]);

function createChampionId(filename) {
  return path
    .parse(filename)
    .name
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createChampionName(filename) {
  return path
    .parse(filename)
    .name
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getChampionClasses() {
  if (!fs.existsSync(CHAMPIONS_DIRECTORY)) {
    throw new Error(
      `No se encontró la carpeta: ${CHAMPIONS_DIRECTORY}`
    );
  }

  return fs
    .readdirSync(CHAMPIONS_DIRECTORY, {
      withFileTypes: true
    })
    .filter((item) => item.isDirectory())
    .map((item) => item.name)
    .sort((a, b) => a.localeCompare(b));
}

function getChampionsFromClass(championClass) {
  const classDirectory = path.join(
    CHAMPIONS_DIRECTORY,
    championClass
  );

  return fs
    .readdirSync(classDirectory, {
      withFileTypes: true
    })
    .filter((item) => item.isFile())
    .filter((item) => {
      const extension = path.extname(item.name).toLowerCase();

      return VALID_IMAGE_EXTENSIONS.has(extension);
    })
    .map((item) => {
      const normalizedClass = championClass.toLowerCase();
      const imagePath = [
        "assets",
        "champions",
        championClass,
        item.name
      ].join("/");

      return {
        id: createChampionId(item.name),
        name: createChampionName(item.name),
        class: normalizedClass,
        image: imagePath
      };
    });
}

function generateChampionDatabase() {
  const championClasses = getChampionClasses();

  const champions = championClasses
    .flatMap(getChampionsFromClass)
    .sort((a, b) => a.name.localeCompare(b.name));

  const output = `/*
 * Este archivo se genera automáticamente.
 * No agregues campeones manualmente aquí.
 * Ejecuta:
 *
 * node tools/generate-champions.cjs
 */

window.ChampionDatabase = ${JSON.stringify(champions, null, 2)};
`;

  fs.mkdirSync(path.dirname(OUTPUT_FILE), {
    recursive: true
  });

  fs.writeFileSync(OUTPUT_FILE, output, "utf8");

  console.log("");
  console.log("Base de campeones generada correctamente.");
  console.log(`Campeones encontrados: ${champions.length}`);
  console.log(`Archivo generado: ${OUTPUT_FILE}`);
  console.log("");
}

try {
  generateChampionDatabase();
} catch (error) {
  console.error("");
  console.error("No se pudo generar la base de campeones.");
  console.error(error.message);
  console.error("");

  process.exitCode = 1;
}
