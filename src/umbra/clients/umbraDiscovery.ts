import dgram from "node:dgram";
import { ClientProgramInfo, UmbraUdpBroadcast } from "../../generated/Common/Types/UmbraServiceTypes";
import { EventEmitter } from "node:stream";

interface CachedBroadcast {
    info: ClientProgramInfo;
    timestamp: number;
}

export class UmbraDiscoveryClient extends EventEmitter {
    private port: number;
    private addr: string;
    private socket: dgram.Socket;
    private cache: Map<string, CachedBroadcast>;
    private cacheTTL: number;

    constructor(port: number = 17474, address: string = "225.68.67.3", cacheTTL = 30000) {
        super();
        this.port = port;
        this.addr = address;
        this.cache = new Map();
        this.cacheTTL = cacheTTL; // cache time in ms

        this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });

        this.socket.on("message", (msg, rinfo) => {
            const broadcast = UmbraUdpBroadcast.decode(msg);
            if (!broadcast.umbraServer) return;

            const clientInfo = broadcast.umbraServer;
            const clientId = clientInfo.clientInfo?.clientname;
            if (!clientId) return;

            // Update cache
            this.cache.set(clientId, { info: clientInfo, timestamp: Date.now() });

            this.emit("broadcast", clientInfo);

            // Cleanup old cache entries
            this.cleanupCache();
        });

        this.socket.bind(this.port, () => {
            this.socket.addMembership(this.addr);
        });
    }

    private cleanupCache() {
        const now = Date.now();
        for (const [clientId, cached] of this.cache.entries()) {
            if (now - cached.timestamp > this.cacheTTL) {
                this.cache.delete(clientId);
            }
        }
    }

    public async getUmbraInfo(umbraServerName: string, timeout = 30000): Promise<ClientProgramInfo | null> {
        // Check cache first
        const cached = this.cache.get(umbraServerName);
        if (cached) return cached.info;

        // If not cached, wait for a broadcast
        return new Promise(resolve => {
            const timer = setTimeout(() => {
                this.removeListener("broadcast", listener);
                resolve(null);
            }, timeout);

            const listener = (broadcast: ClientProgramInfo) => {
                if (broadcast.clientInfo?.clientname === umbraServerName) {
                    clearTimeout(timer);
                    this.removeListener("broadcast", listener);
                    resolve(broadcast);
                }
            };

            this.on("broadcast", listener);
        });
    }

    close() {
        this.socket.close();
    }
}
