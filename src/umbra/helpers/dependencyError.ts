import { DependencyData } from "../../generated/Common/Types/DependencyTypes";

/**
 * Represents an error that occurs when a object cannot be deleted due to existing dependencies.
 */
export class DependencyError extends Error {
    /**
     * Detailed dependency information returned by the server, if available.
     */
    public readonly dependencies: DependencyData | undefined;

    /**
     * Creates a new DependencyError.
     *
     * @param message - A descriptive error message explaining why the deletion failed.
     * @param dependencies - Optional dependency data detailing the resources blocking deletion.
     */
    constructor(message: string, dependencies: DependencyData | undefined) {
        super(message);
        this.name = "DependencyError";
        this.dependencies = dependencies;

        // Maintain proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, DependencyError.prototype);
    }
}

