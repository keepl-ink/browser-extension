import { SavedUrl } from "@/store/AppContext";
import { Storage } from "../storage";

export class LocalStorage extends Storage {
  getUrls(): Promise<SavedUrl[]> {
    throw new Error("Method not implemented.");
  }

  deleteUrl(_url: string): void {
    throw new Error("Method not implemented.");
  }
  addUrl(_url: string): void {
    throw new Error("Method not implemented.");
  }
}
