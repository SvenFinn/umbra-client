import { ClientDuplexStream } from "@grpc/grpc-js";
import { EClientType, PingPong } from "../../generated/Common/Types/UmbraServiceTypes";
import { ConnectedClientServiceClient } from "../../generated/Common/UmbraClientService";
import { ClientStore } from "../store";
import { BroadcastMessage } from "../../generated/Common/Types/BroadcastServiceTypes";
import { BaseClient } from "../baseClient";
import { gracefulStopDuplexStream, translateToString } from "../helpers/request";

export class ConnectedClientService extends BaseClient {
    private pingCounter: number = 0;
    private pingInterval: NodeJS.Timeout | undefined;
    private pingChannel: ClientDuplexStream<PingPong, PingPong>;
    private broadcastChannel: ClientDuplexStream<BroadcastMessage, BroadcastMessage>;
    private client: ConnectedClientServiceClient;

    constructor(store: ClientStore) {
        super(store);
        this.client = new ConnectedClientServiceClient(store.connectionString!, store.credentials!);
        this.broadcastChannel = this.client.sendBroadcast(this.store.getMetadata());
        this.pingChannel = this.client.ping(this.store.getMetadata());
        this.pingChannel.on("data", (pong: PingPong) => {
            if (pong.clientname !== this.store.clientName) {
                pong.responder = this.store.clientName || "";
                this.pingChannel.write(pong);
            }
        });
        this.pingInterval = setInterval(() => {
            const ping: PingPong = {
                requestCounter: this.pingCounter.toString(),
                clientname: this.store.clientName || "",
                responder: this.store.umbraInfo?.clientname || "",
                performanceTest: false,
                performanceTTL: 0
            };
            this.pingCounter++;
            this.pingChannel.write(ping);
        }, 5000);
    }

    public async reportReadyToWork(readyToWork: boolean, receiveAndDisplayMessages: boolean): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.reportReadyToWork({
                state: {
                    readyToWork,
                    receiveAndDisplayMessages
                }
            }, this.store.getMetadata(), (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to report ready to work"));
                }
                resolve();
            });
        });
    }

    public async sendChatMessage(message: string): Promise<void> {
        await this.sendBroadcastMessage({
            messageType: "Chat",
            stringContent: message,
            receiverHostnames: [],
            receiverType: EClientType.EClientType_Unknown,
            rawContent: undefined
        });
    }

    public async sendBroadcastMessage(message: Omit<BroadcastMessage, "senderName" | "requestId">): Promise<void> {
        return new Promise((resolve, reject) => {
            this.broadcastChannel.write({
                ...message,
                senderName: this.store.clientName,
                requestId: this.store.createRequestId(),

            }, (err) => {
                if (err) {
                    return reject(err);
                }
                resolve();
            });
        });
    }

    public getBroadcastChannel(): ClientDuplexStream<BroadcastMessage, BroadcastMessage> {
        return this.broadcastChannel;
    }

    public async close() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = undefined;
        }
        await Promise.all([
            gracefulStopDuplexStream(this.broadcastChannel),
            gracefulStopDuplexStream(this.pingChannel)
        ]);
        this.client.close();
    }
}