import { ClientDuplexStream } from "@grpc/grpc-js";
import { ClientInfoStore } from "../ClientInfo";
import { PingPong } from "../generated/Common/Types/UmbraServiceTypes";
import { UmbraConnectionClient } from "./umbraConnection";

export class UmbraPing {
    private pingCounter = 0;
    private umbraConnection: UmbraConnectionClient;
    private clientInfoStore: ClientInfoStore;

    private pingInterval: NodeJS.Timeout | undefined;

    private channel: ClientDuplexStream<PingPong, PingPong> | undefined;

    constructor(umbraConnection: UmbraConnectionClient, clientInfoStore: ClientInfoStore) {
        this.umbraConnection = umbraConnection;
        this.clientInfoStore = clientInfoStore;
        this.umbraConnection.on("connected", () => {
            this.connect();
        });
        this.umbraConnection.on("disconnected", () => {
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = undefined;
            }
            this.channel = undefined;
        });

        if (this.umbraConnection.connected()) {
            this.connect();
        }
    }

    private connect() {
        const client = this.umbraConnection.getConnectedClientService();
        if (!client) {
            return;
        }
        this.channel = client.ping(this.umbraConnection.getMetadata());

        this.channel.on("data", (pong: PingPong) => {
            if (pong.clientname !== this.clientInfoStore.getClientProgramInfo().clientInfo?.clientname) {
                pong.responder = this.clientInfoStore.getClientProgramInfo().clientInfo?.clientname || "";
                this.channel?.write(pong);
            }
        });

        this.sendPings();
    }

    private sendPings() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }
        this.pingInterval = setInterval(() => {
            const ping = this.getNextPing();
            this.channel?.write(ping);
        }, 5000);
    }

    public getNextPing(): PingPong {
        this.pingCounter++;
        return {
            requestCounter: this.pingCounter.toString(),
            clientname: this.clientInfoStore.getClientProgramInfo().clientInfo?.clientname || "",
            responder: this.umbraConnection.getUmbraInfo()?.clientInfo?.clientname || "",
            performanceTest: false,
            performanceTTL: 0
        };
    }
}