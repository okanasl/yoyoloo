import { AttachmentAdapter, PendingAttachment, CompleteAttachment } from "@assistant-ui/react";

export class StrictImageAttachmentAdapter implements AttachmentAdapter {
  public accept = "image/jpeg, image/png, image/webp";

  public async add(state: { file: File }): Promise<PendingAttachment> {
     const acceptedTypes = this.accept.split(',').map(t => t.trim());
     if (!acceptedTypes.includes(state.file.type)) {
       alert(`File type ${state.file.type} not accepted.`);
       throw new Error(`File type ${state.file.type} not accepted.`);
     }

    return {
      id: state.file.name,
      type: "image",
      name: state.file.name,
      contentType: state.file.type,
      file: state.file,
      status: { type: "requires-action", reason: "composer-send" },
    };
  }

  public async send(
    attachment: PendingAttachment,
  ): Promise<CompleteAttachment> {
    if (!attachment.file) {
        throw new Error("Attachment is missing the file data.");
    }
    return {
      ...attachment,
      status: { type: "complete" },
      content: [
        {
          type: "image",
          // Ensure getFileDataURL is called correctly with the file
          image: await getFileDataURL(attachment.file),
        },
      ],
    };
  }

  public async remove() {
    // noop
  }
}

const getFileDataURL = (file: File): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);

    reader.readAsDataURL(file);
});