import { Observable } from 'rxjs';
import { Activity } from 'botframework-directlinejs';

export interface ChatConnector {
    send(text: string): void;
    postActivity(activity: Activity): Observable<Activity>; // returns the activity sent to chat channel, potentialy augmented with id etc.
    activity$: Observable<Activity>; // activities received from chat channel 
}
