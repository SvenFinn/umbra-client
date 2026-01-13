import { CueAddFromProgrammerRequest_EAddType } from "./generated/Common/Types/Cuelist/CuelistServiceTypes";
import { ClientManager } from "./umbra/clientManager";
import { ClientStore } from "./umbra/store";

async function main() {
    const clientManager = new ClientManager("TypeScriptUmbraClient");
    await clientManager.login("DefaultUnknownServerName");
    console.log("Logged in");
    // await clientManager.connectedClientService?.sendChatMessage("Hello from TypeScript Umbra Client!");
    // await clientManager.audioClient?.stopAllPlayers();
    // console.log((await clientManager.cueListClient!.getCuelists(["62ba1b69-44af-40c0-a731-a4d6a7672680"])));
    // await clientManager.cueListClient?.stopAllCuelists();
    console.log(await clientManager.attachableClient?.getAttachables());

    await clientManager.close();
}



main();
