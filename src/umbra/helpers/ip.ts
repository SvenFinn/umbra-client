import { Socket } from "net";

export async function checkValidIp(ips: string[], port: number): Promise<string | null> {
    // Check which Ips are reachable and select one

    try {
        const reachableIp = await Promise.any(
            ips.map(ip =>
                checkHostReachable(ip, port)
                    .then(reachable => reachable ? ip : Promise.reject())
            )
        );
        return reachableIp;
    } catch {
        return null;
    }
}

export async function checkHostReachable(host: string, port: number, timeout = 5000): Promise<boolean> {
    return new Promise((resolve) => {
        const socket = new Socket();

        const onError = () => {
            socket.destroy();
            resolve(false);
        };

        socket.setTimeout(timeout);
        socket.once("error", onError);
        socket.once("timeout", onError);

        socket.connect(port, host, () => {
            socket.end();
            resolve(true);
        });
    });
}
