// import { randomUUID } from "node:crypto";
// import { ClientProgramInfo, EClientType } from "./generated/Common/Types/UmbraServiceTypes";
// import { UmbraConnectionClient } from "./umbra/umbraConnection";
// import { ClientInfoStore } from "./ClientInfo";
// import { UmbraPing } from "./umbra/umbraPing";
// import { UmbraBroadcast } from "./umbra/umbraBroadcast";
// import { UmbraClientsInfo } from "./umbra/umbraClientsInfo";

// const clientInfoStore: ClientInfoStore = new ClientInfoStore({
//     programmName: "TypeScriptClient",
//     programVersion: "0.1.0",
//     buildDate: Date.now().toString(),
//     vendor: "Sven Finn",
// });

// async function main() {
//     const client = new UmbraConnectionClient(clientInfoStore);
//     await client.login("DefaultUnknownServerName");
//     console.log("Logged in");

//     const ping = new UmbraPing(client, clientInfoStore);
//     const broadcast = new UmbraBroadcast(client, clientInfoStore);
//     broadcast.on("broadcast", (msg) => {
//         console.log("Received broadcast", msg);
//     });
//     const clientsInfo = new UmbraClientsInfo(client);

// }

// main()

import { DMXControlClient } from "./umbra";

async function main() {
    const client = new DMXControlClient("TESTING", {
        buildDate: Date.now().toString(),
        programVersion: "0.1.0",
        programmName: "TypeScriptClient",
        vendor: "Sven Finn",
    });
    await client.login("DefaultUnknownServerName");
    console.log("Logged in");

}

main();
