import { State } from "./cli/state.ts";
import { Denomander, resolve } from "./deps.ts";

const initDenomander = () => {
  const program = new Denomander({
    app_name: "Nessie Migrations",
    app_description: "A database migration tool for Deno.",
    app_version: "0.4.1",
  });

  program
    .option("-d --debug", "Enables verbose output")
    .option(
      "-c --config",
      "Path to config file, will default to ./nessie.config.ts",
    )
    .option("-a --amount", "Number of to migrate/rollback. If not provided, it will do them all.")
    .command("init", "Generates the config file")
    .command("make [migrationName]", "Creates a migration file with the name")
    .command("migrate", "Migrates one migration")
    .command("rollback", "Rolls back one migration");

  program.parse(Deno.args);

  return program;
};

const initNessie = async () => {
  const responseFile = await fetch(
    "https://deno.land/x/nessie/cli/templates/config.ts",
  );

  await Deno.writeTextFile(
    resolve(Deno.cwd(), "nessie.config.ts"),
    await responseFile.text(),
  );

  await Deno.mkdir(resolve(Deno.cwd(), "migrations"), { recursive: true })
  await Deno.create(resolve(Deno.cwd(), "migrations/.gitkeep"))
};

const run = async () => {
  const prog = initDenomander();

  try {
    if (prog.init) {
      await initNessie();
    } else {
      const state = await new State(prog).init();

      if (prog.make) {
        await state.makeMigration(prog.make);
      } else {
        await state.client!.prepare();

        if (prog.migrate) {
          await state.client!.migrate(prog.amount);
        } else if (prog.rollback) {
          await state.client!.rollback(prog.amount);
        }

        await state.client!.close();
      }
    }
    Deno.exit();
  } catch (e) {
    console.error(e);
    Deno.exit(1);
  }
};

run();
