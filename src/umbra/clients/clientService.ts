import { UmbraLoginResponse, UmbraLoginResponse_EReturnCode } from "../../generated/Common/Types/UmbraServiceTypes";
import { ClientServiceClient } from "../../generated/Common/UmbraClientService";
import { BaseClient } from "../baseClient";
import { ClientStore } from "../store";

export class ClientService extends BaseClient<ClientServiceClient> {
    constructor(store: ClientStore) {
        super(store, ClientServiceClient);
    }

    public async login(): Promise<UmbraLoginResponse> {
        if (this.store.sessionId) {
            throw new Error("Session ID already set, cannot login again");
        }
        return new Promise((resolve, reject) => {
            this.client.login({
                client: this.store.getClientProgramInfo(),
            }, (err, response: UmbraLoginResponse) => {
                if (err) {
                    return reject(err);
                }
                switch (response.returnCode) {
                    case UmbraLoginResponse_EReturnCode.NoError:
                    case UmbraLoginResponse_EReturnCode.AlreadyLoggedIn:
                        break;
                    default:
                        return reject(new Error(`Login failed with code ${UmbraLoginResponse_EReturnCode[response.returnCode]}, reason: ${response.message}`));
                }
                this.store.sessionId = response.sessionId;
                this.store.umbraInfo = response.umbraServer?.clientInfo;
                resolve(response!);
            });
        });
    }

    public async logoff(): Promise<string> {
        if (!this.store.sessionId) {
            throw new Error("No session ID set, cannot log off");
        }
        return new Promise((resolve, reject) => {
            this.client.logoff({ client: this.store.getClientProgramInfo() }, (err, response) => {
                if (err) {
                    return reject(err);
                }
                resolve(response.bye);
            });
        });
    }

    public async close() {
        await this.logoff();
        await super.close();
    }
}