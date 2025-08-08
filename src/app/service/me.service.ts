import { Injectable } from "@angular/core";
import { Member } from "../model/member.model";
import { GitLabApiService } from "../git-lab-api/git-lab-api.service";
import { SAMPLE_MEMBERS } from "../model/sample-members";
import { from, Observable } from "rxjs";
import { isDebug } from "../debug";
import { GitLabConfigStoreService } from "../store/git-lab-config-store.service";

@Injectable({
    providedIn: 'root',
})
export class MeService {
    private me: Member | undefined = undefined;

    constructor(
        private readonly gitlabApiService: GitLabApiService,
        private readonly gitlabConfigStore: GitLabConfigStoreService
    ) {}

    /**
     * 私の情報を取得する
     * @return 私の情報のObservable
     */
    syncMe(): Observable<Member | undefined> {
        if (isDebug) {
            return from([SAMPLE_MEMBERS[0]]);
        }

        const config = this.gitlabConfigStore.config;
        const accessToken = config.accessToken;
        return from([]);
    }
}