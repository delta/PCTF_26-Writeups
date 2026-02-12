export function cowsay(text: string): string {
    const lines = text.split("\n");
    const maxLength = Math.max(...lines.map((l) => l.length));
    const border = "-".repeat(maxLength + 2);
    const top = "_".repeat(maxLength + 2);
    let bubble = ` ${top}\n`;
    if (lines.length === 1) {
        bubble += `< ${lines[0]} >\n`;
    } else {
        bubble += `/ ${lines[0].padEnd(maxLength)} \\\n`;
        for (let i = 1; i < lines.length - 1; i++) {
            bubble += `| ${lines[i].padEnd(maxLength)} |\n`;
        }
        bubble += `\\ ${lines[lines.length - 1].padEnd(maxLength)} /\n`;
    }
    bubble += ` ${border}\n`;
    const cow = `        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`;
    return bubble + cow;
}