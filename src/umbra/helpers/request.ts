import { ClientDuplexStream, ClientReadableStream } from "@grpc/grpc-js";
import { ObjectData, TranslateableData } from "../../generated/Common/Types/CommonTypes";
import { Status } from "@grpc/grpc-js/build/src/constants";
import { once } from "events";

export async function gracefulStopReadableStream(stream: ClientReadableStream<any> | undefined) {
    if (!stream) return;

    stream.removeAllListeners("error");
    stream.on("error", (err: any) => {
        switch (err.code) {
            case Status.CANCELLED:
            case Status.UNAVAILABLE:
                break;
            default:
                console.error("Stream error:", err);
        }
    });

    stream.cancel();
}

export async function gracefulStopDuplexStream(stream: ClientDuplexStream<any, any> | undefined, timeoutMs = 500) {
    if (!stream) return;

    stream.removeAllListeners("error");
    stream.on("error", (err: any) => {
        switch (err.code) {
            case Status.CANCELLED:
            case Status.UNAVAILABLE:
                break;
            default:
                console.error("Stream error:", err);
        }
    });

    stream.end();

    // Wait for the server to finish or our writable to flush.
    const p = Promise.race([
        once(stream as any, "end").then(() => "end"),
        new Promise(resolve => setTimeout(() => resolve("timeout"), timeoutMs))
    ]);

    const result = await p;
    if (result === "timeout") {
        try { stream.cancel(); } catch { /* ignore */ }
    }
}



export function translateToString(data: TranslateableData | undefined, usePlural = false): string | undefined {
    if (!data) return undefined;
    const format = usePlural && data.pluralFormatString
        ? data.pluralFormatString
        : data.formatString;

    if (!format) return "";

    const paramValues = data.parameters.map(param => {
        if (param.translateable) {
            // Recursively convert nested translation
            return translateToString(param.translateable, usePlural);
        } else if (param.objectData) {
            return objectDataToString(param.objectData);
        } else {
            return "";
        }
    });

    // Replace {0}, {1}, etc.
    return format.replace(/\{(\d+)\}/g, (_, index) => {
        const i = Number(index);
        return paramValues[i] ?? "";
    });
}

function objectDataToString(obj: ObjectData): string {
    if (obj.stringValue !== undefined) return obj.stringValue;
    if (obj.boolValue !== undefined) return String(obj.boolValue);
    if (obj.intValue !== undefined) return obj.intValue.toString();
    if (obj.doubleValue !== undefined) return obj.doubleValue.toString();
    if (obj.floatValue !== undefined) return obj.floatValue.toString();
    if (obj.longValue !== undefined) return obj.longValue;
    if (obj.uintValue !== undefined) return obj.uintValue.toString();
    if (obj.ulongValue !== undefined) return obj.ulongValue;
    if (obj.shortValue !== undefined) return obj.shortValue.toString();
    if (obj.sbyteValue !== undefined) return obj.sbyteValue.toString();
    if (obj.ushortValue !== undefined) return obj.ushortValue.toString();
    if (obj.byteValue !== undefined) return obj.byteValue.toString();
    // Optional: fallback handling for binary data
    if (obj.fallbackNet) return `[binary data: ${obj.fallbackNet.length} bytes]`;
    if (obj.fallbackProtobuf) return `[protobuf data: ${obj.fallbackProtobuf.length} bytes]`;
    return "";
}
