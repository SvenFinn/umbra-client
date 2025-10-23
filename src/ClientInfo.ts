import { randomUUID } from "crypto";
import { ClientInfo, ClientProgramInfo, EClientCapabilities, EClientType, ProgramInfo } from "./generated/Common/Types/UmbraServiceTypes";
import { hostname, networkInterfaces } from "os";
import { UserContextDescriptor } from "./generated/Common/Types/User/UserServiceTypes";


export class ClientInfoStore {
    private programInfo: ProgramInfo;
    private umbraInfo: ClientInfo | undefined;
    private clientName: string;
    private userContextId: string | undefined;

    private runtimeId: string = randomUUID();

    constructor(programInfo: ProgramInfo, clientName: string = "TypeScriptClient") {
        this.programInfo = programInfo;
        this.clientName = clientName;
        this.userContextId = undefined;
    }

    public setUmbraInfo(umbraInfo: ClientInfo | undefined) {
        this.umbraInfo = umbraInfo;
    }

    public setUserContextId(userContextId: string) {
        this.userContextId = userContextId;
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

    public getUserContextId(): string | undefined {
        return this.userContextId;
    }

}