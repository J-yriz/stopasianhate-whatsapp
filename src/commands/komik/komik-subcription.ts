import config from "../../configDev";
import ClientBot from "../../utility/ClientBot";
import { prisma } from "../../utility/db/Prisma";
import { IResponse } from "../../utility/Types";
import { proto, WASocket } from "@whiskeysockets/baileys";
import { deletePrefixCommand } from "../../utility/Function";

const subscription = {
  name: "komik-subs",
  description: "komik subscription command",
  dmOnly: true,
  maintenance: false,
  async execute(message: proto.IWebMessageInfo, sock: WASocket, clint: ClientBot) {
    const keyRemoteJid = message.key.remoteJid as string;
    const messageUser = deletePrefixCommand(message.message?.conversation?.toLowerCase() as string, this.name);

    if (!messageUser)
      return await sock.sendMessage(keyRemoteJid, {
        text: `Masukan nama komik!\n\nKamu bisa command untuk mencari komik.\n*${config.prefix}komik-search [nama komik]*`,
      });

    const userDataDB = await prisma.user.findMany({ where: { number: keyRemoteJid } });
    if (!userDataDB.length) return await sock.sendMessage(keyRemoteJid, { text: `Silahkan regis terlbeih dahulu!\n*${config.prefix}komik-regis*` });

    try {
      const { data } = await clint.instance.get<IResponse>(`/search?keyword=${messageUser}`);
      const dataResponse: IResponse = data;
      const dataKomik = dataResponse.data.slice(0, 1);

      if (!dataKomik.length) return await sock.sendMessage(keyRemoteJid, { text: "Komik not found!" });

      let messageResponse: string = `─────= *📚 Confirm Komik 📚* =─────\n`;
      messageResponse += `*${dataKomik[0].title}*\n`;
      messageResponse += `- Type: ${dataKomik[0].type}\n`;
      messageResponse += `- Chapter: ${dataKomik[0].chapter}\n`;
      messageResponse += `- Rating: ${dataKomik[0].rating}\n\n`;
      messageResponse += `Jika benar silahkan ketik *${config.prefix}komik-subscon*\ndan jika salah silahkan ketik *${config.prefix}komik-subscan*`;

      clint.saveCmdRunKomik[keyRemoteJid] = { commandName: this.name, title: dataKomik[0].title, chapter: dataKomik[0].chapter };

      const imageMessage = await sock.sendMessage(keyRemoteJid, { image: { url: dataKomik[0].thumbnail } });
      return await sock.sendMessage(keyRemoteJid, { text: messageResponse }, { quoted: imageMessage });
    } catch (error) {
      console.log(error);
      return await sock.sendMessage(keyRemoteJid, { text: "Error" });
    }
  },
};

export default subscription;