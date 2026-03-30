import { SavedUrl } from "@/store/AppContext";

export abstract class Storage{
  abstract getUrls(): Promise<SavedUrl[]>
  abstract deleteUrl(url: string): void
  abstract addUrl(url: string): void
}
