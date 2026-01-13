import { AffinityClientClient } from "../../generated/Client/AffinityClient";
import { GetAffinityListRequestResponse, GetUserDefinedAffinityListsResponse } from "../../generated/Common/Types/AffinityServiceTypes";
import { IEnumObjectData } from "../../generated/Common/Types/ValueTypes";
import { BaseClient } from "../baseClient";
import { translateToString } from "../helpers/request";
import { ClientStore } from "../store";

/**
 * Provides access to the server's Affinity subsystem, which manages relationships
 * between visual or logical elements such as gobos, icons, and other reference data.
 *
 * The `AffinityClient` handles RPC communication with the server’s Affinity service.
 * It allows querying available affinity classes, retrieving reference data,
 * managing user-defined affinity lists, and interacting with related metadata.
 *
 * Each method wraps an asynchronous RPC call and returns a `Promise` that resolves
 * with the server response or rejects with an error if the request fails.
 */
export class AffinityClient extends BaseClient<AffinityClientClient> {

    constructor(store: ClientStore) {
        super(store, AffinityClientClient);
    }

    /**
     * Retrieves the list of available affinity classes.
     *
     * @returns A Promise that resolves with an array of affinity class names.
     *
     * @throws {Error} If the RPC call fails or the server does not return a valid response.
     */
    public async getAffinityClasses(): Promise<string[]> {
        return new Promise((resolve, reject) => {
            this.client.getAffinityClasses({ requestId: this.store.createRequestId() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.classNames);
            });
        });
    }

    /**
     * Retrieves the reference data for a given affinity class.
     *
     * @param className - The name of the affinity class to retrieve reference data for.
     * @returns A Promise that resolves with a list of reference objects associated with the specified class.
     *
     * @throws {Error} If the RPC call fails or the server does not return a valid response.
     */
    public async getAffinityClassReferenceList(className: string): Promise<IEnumObjectData[]> {
        return new Promise((resolve, reject) => {
            // Why is the className passed as the requestId??
            // DMXC-3.3.1
            this.client.getAffinityClassReferenceList({ requestId: className }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.referenceList);
            });
        });
    }

    //TODO: Dafuq, how do I interface with this?
    // Why does it take a response as a request?
    public async getAffinityList(req: GetAffinityListRequestResponse): Promise<GetAffinityListRequestResponse> {
        return new Promise((resolve, reject) => {
            this.client.getAffinityList(req, (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response);
            });
        });
    }

    public async setUserDefinedAffinityList(className: string, referenceObjectId: string, itemListId: string = ""): Promise<void> {
        return new Promise((resolve, reject) => {
            this.client.setUserDefinedAffinityList({ className, referenceObjectId, itemListId }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                if (!response.ok) {
                    return reject(new Error(translateToString(response.message) || "Failed to set user defined affinity list"));
                }
                resolve();
            });
        });
    }

    // Brother in christus, I have no fucking clue what this function is supposed to do
    // It only ever returns an empty list
    public async getUserDeffinedAffinityLists(className: string): Promise<GetUserDefinedAffinityListsResponse> {
        return new Promise((resolve, reject) => {
            this.client.getUserDefinedAffinityLists({ requestId: className }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response);
            });
        });
    }
}
