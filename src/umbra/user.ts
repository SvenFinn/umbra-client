import { UserClientClient } from "../generated/Client/UserClient";

const client = new UserClientClient("localhost:50051", null!);
client.bind({
    username: "testuser",
    requestId: "req-12345",
    passwordHash: "hashedpassword",
}, null!, (error, response) => {
    if (error) {
        console.error("Error during bind:", error);
    } else {
        console.log("Bind response:", response);
    }
})