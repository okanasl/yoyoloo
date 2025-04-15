
/**
 * For media items displayed in user library
 */
type LibraryItem = {
    id: string;
    name: string;
    data: Blob | File | string;
    thumbnailData?: Blob | File | string;
}

export type { LibraryItem }
