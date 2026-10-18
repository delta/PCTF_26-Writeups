import { createCipheriv, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
import { cowsay } from "./cowsay.ts";
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
await load({ export: true });
const PORT = parseInt(Deno.env.get("PORT") || "1342"); //Port Define
const FLAG = Deno.env.get("FLAG");
const SECRET_SOUND = Deno.env.get("SECRET_SOUND");
if (!FLAG || !SECRET_SOUND) {
    throw new Error("FLAG or SECRET_SOUND not set in environment");
}
const key = randomBytes(32);
const iv = randomBytes(16);
console.log(`Dum C0ws! Server starting on port ${PORT}...`);
const listener = Deno.listen({ port: PORT });
for await (const conn of listener) {
    handleConn(conn);
}
async function handleConn(conn: Deno.Conn) {
    const buf = new Uint8Array(1024);
    const cipher = createCipheriv("aes-256-ctr", key, iv);
    try {
        const welcome = `
 _____________________________________________________________________________________________________________________________________________________________________________________
Something is wrong…
Fix Me with FIX_COW Command so i can speak MOOOOOOO! >
 -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||

Give your cow a name:  `;
        await conn.write(new TextEncoder().encode(welcome));
        while (true) {
            const n = await conn.read(buf);
            if (n === null) break;
            const input = new TextDecoder().decode(buf.subarray(0, n)).trim();
            if (input === "EXIT") break;
            if (input.startsWith("FIX_COW ")) {
                const guess = input.slice(8);
                if (guess === SECRET_SOUND) {
                    const moo = cowsay("Mooooo!!!");
                    const flagEnc = cipher.update(Buffer.from(FLAG));
                    await conn.write(new TextEncoder().encode(`\n${moo}\n[!] COW FIXED! THE FLAG SPEAKS:\n${flagEnc.toString("base64")}\n\n`));
                    continue;
                } else {
                    await conn.write(new TextEncoder().encode("\n[!] The cow looks at you with confusion. That is not my Voice.\n\n"));
                    continue;
                }
            }
            const nameEnc = cipher.update(Buffer.from(input));
            const soundEnc = cipher.update(Buffer.from(SECRET_SOUND));
            const nameStr = nameEnc.toString("base64");
            const soundStr = soundEnc.toString("base64");
            const cow = cowsay("DURRRRR!!!");
            await conn.write(new TextEncoder().encode(`\n${cow}\n[Name: ${nameStr}] says: ${soundStr}\n\nGive your cow a name: `));
        }
    } catch (err) {
    } finally {
        conn.close();
    }
}