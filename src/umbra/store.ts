import { ChannelCredentials, Metadata } from "@grpc/grpc-js";
import { hostname, networkInterfaces } from "os";
import { ClientInfo, ClientProgramInfo, EClientCapabilities, EClientType, eClientTypeToJSON, ProgramInfo } from "../generated/Common/Types/UmbraServiceTypes";
import { v4 as uuidv4 } from "uuid";

export class ClientStore {
    public connectionString: string | undefined;
    public userContextId: string | undefined
    public sessionId: string | undefined;
    public credentials: ChannelCredentials;
    public programInfo: ProgramInfo;
    public umbraInfo: ClientInfo | undefined;
    public clientName: string;
    public readonly runtimeId: string = uuidv4();
    private requestCounter: number = 0;

    constructor(clientName: string = "TypeScriptClient", clientSpec: Partial<ProgramInfo> | undefined) {
        this.clientName = clientName;
        this.credentials = ChannelCredentials.createInsecure();
        this.programInfo = {
            buildDate: Date.now().toString(),
            programmName: "UmbraTypeScriptClient",
            programVersion: "0.0.1",
            vendor: "Sven Finn",
            ...clientSpec
        };
    }

    public getClientProgramInfo(): ClientProgramInfo {
        const ips = Object.values(networkInterfaces())
            .flatMap(iface => iface ? iface.filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address) : [])
        return {
            clientInfo: {
                clientCapabilities: EClientCapabilities.LatencyMeasure,
                clientname: this.clientName,
                connectedToUmbra: this.umbraInfo?.clientname || "",
                hostname: hostname(),
                networkid: this.umbraInfo?.networkid || "",
                projectName: this.umbraInfo?.projectName || "",
                runtimeid: this.runtimeId,
                ips: ips,
                type: EClientType.ExternalTool,
                state: { readyToWork: false, receiveAndDisplayMessages: false },
                umbraPort: this.umbraInfo?.umbraPort || 0,
                umbraSecurePort: this.umbraInfo?.umbraSecurePort || 0,
            },
            programInfo: this.programInfo,
            clientTimestampUTC: Date.now().toString(),
            connectionLatencyMicroSeconds: 0,
            umbraTimestampUTC: "0"
        }
    }

    public getMetadata(): Metadata {
        const metadata = new Metadata();
        metadata.set("sessionID", this.sessionId || "");
        return metadata;
    }

    public createRequestId(): string {
        return `${eClientTypeToJSON(EClientType.ExternalTool)}-${this.clientName}-${this.requestCounter++}`;
    }
}