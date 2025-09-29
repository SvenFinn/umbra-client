import { UmbraDiscoveryClient } from "./umbraDiscovery";

const client = new UmbraDiscoveryClient();

client.on("broadcast", (broadcast) => {
    console.log("Received broadcast:", broadcast);
});