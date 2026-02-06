/**
 * DTO: UpdateEmailDto
 * 
 * Data Transfer Object for updating a user's email address.
 */
export interface UpdateEmailDto {
    /**
     * User ID
     */
    readonly userId: string;

    /**
     * New email address
     */
    readonly newEmail: string;

    /**
     * Current password for verification
     */
    readonly currentPassword: string;
}
