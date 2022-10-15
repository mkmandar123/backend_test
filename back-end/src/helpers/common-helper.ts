export class CommonHelper {
  public static getMissingFields(requiredFields: Array<string>, receivedFields: Array<string>): Array<string> {
    const missingFields: Array<string> = [];

    requiredFields.forEach((key: string) => {
      if (!receivedFields.includes(key)) {
        missingFields.push(key);
      }
    });
    return missingFields;
  }
}
