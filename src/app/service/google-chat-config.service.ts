import { Injectable } from "@angular/core";
import { isNull } from "../utils/utils";
import { GoogleChatConfig } from "../model/google-chat-config.model";
import { from, map, Observable } from "rxjs";

@Injectable({
    providedIn: "root",
})
export class GoogleChatConfigService {
    private config: GoogleChatConfig[] = [];

    readGoogleChatConfig(): Observable<GoogleChatConfig[] | null> {
        return from(window.electronAPI.readGoogleChatConfig()).pipe(
            map((config) => {
                if (isNull(config)) {
                    return null;
                }
                this.config = config;
                return this.config;
            })
        );  
    }

    getConfig(): GoogleChatConfig[] {
        return this.config;
    }
}