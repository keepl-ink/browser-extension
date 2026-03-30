import { SavedUrl } from "@/store/AppContext";
import { Storage } from "../storage";

export class KeeplinkStorage extends Storage {
  private static apiUrl = "https://api.keepl.ink/";

  getUrls(): Promise<SavedUrl[]> {
    void KeeplinkStorage.apiUrl;
    throw new Error("Method not implemented.");
  }

  deleteUrl(_url: string): void {
    throw new Error("Method not implemented.");
  }

  addUrl(_url: string): void {
    throw new Error("Method not implemented.");
  }
}
