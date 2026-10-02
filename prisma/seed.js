const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const pal = await prisma.palazzina.create({
        data: { nome: "Via Pola", indirizzo: "Via Pola" },
    });

    const grassi = await prisma.inquilino.create({ data: { nome: "Grassi", tipo: "PERSONA" } });
    const mustafa = await prisma.inquilino.create({ data: { nome: "Mustafa", tipo: "PERSONA" } });
    const ballafon = await prisma.inquilino.create({ data: { nome: "Ballafon", tipo: "SOCIETA" } });

    // contatore generale della palazzina
    await prisma.contatore.create({ data: { palazzinaId: pal.id, tipo: "ACQUA", numero: "generale" } });

    const unita = [
        { nome: "Primo - int. 1", piano: "Primo", interno: "1", tipo: "APPARTAMENTO", inq: grassi, contatore: "1989", persone: 2 },
        { nome: "Primo - int. 2", piano: "Primo", interno: "2", tipo: "APPARTAMENTO", inq: ballafon, contatore: "20-223223", persone: 10 },
        { nome: "Terra - int. 1", piano: "Terra", interno: "1", tipo: "APPARTAMENTO", inq: mustafa, contatore: "20-165592", persone: 4 },
        { nome: "Terra - int. 2", piano: "Terra", interno: "2", tipo: "APPARTAMENTO", inq: ballafon, contatore: "20-235661", persone: 8 },
        { nome: "Lavanderia", piano: "Terra", interno: null, tipo: "LAVANDERIA", inq: ballafon, contatore: null, persone: null },
    ];

    for (const u of unita) {
        const un = await prisma.unita.create({
            data: { palazzinaId: pal.id, nome: u.nome, piano: u.piano, interno: u.interno, tipo: u.tipo },
        });
        await prisma.contatore.create({
            data: { palazzinaId: pal.id, unitaId: un.id, tipo: "ACQUA", numero: u.contatore },
        });
        await prisma.contratto.create({
            data: {
                unitaId: un.id,
                inquilinoId: u.inq.id,
                tipo: "LUNGO",
                dataInizio: new Date("2021-11-20"), // TODO: sostituire con la data reale del contratto
                persone: u.persone,
            },
        });
    }
}

main().finally(() => prisma.$disconnect());