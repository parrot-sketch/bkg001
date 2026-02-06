/**
 * DTO: UpdatePasswordDto
 * 
 * Data Transfer Object for updating a user's password.
 */
export interface UpdatePasswordDto {
    /**
     * User ID
     */
    readonly userId: string;

    /**
     * Current password for verification
     */
    readonly currentPassword: string;

    /**
     * New password
     */
    readonly newPassword: string;
}
