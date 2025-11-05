import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
    ytDlpPath: string;
    brewPath: string;
    downloadPath: string;
}

const preferences: Preferences = getPreferenceValues<Preferences>();


type Values = {
    url: string;
    title: string;
};

interface YtFormat {
    format_id: string;
    resolution: string;
    ext: string; // is this filetype??
    audio_ext: string;
    video_ext: string;
    format_note: string;
    tbr: number;
}

export default function Command() {

    async function handleUrlChanged(newValue: string) {
        console.log("URL changed:", newValue);
        const formats = await fetchFormatOptions(newValue);
    }


    // function to handle form submission
    function handleSubmit(values: Values) {
        console.log(values.url);
        showToast({ 
            title: "Downloading audio...", 
            message: `URL: ${values.url}` 
        });
    }

    // function to fetch available format options using yt-dlp with this command:
// yt-dlp --dump-json "https://www.youtube.com/watch?v=AX6OrbgS8lI" | jq '.' > formats.json
    async function fetchFormatOptions (url: string) {
        if (!url) return;


        try{
            const { stdout } = await execAsync(`${preferences.ytDlpPath} --dump-json "${url}"`);

        }
        catch (error) {
            console.error("Error fetching format options:", error);
        }

    }

    return (
        <Form 
            actions={
                <ActionPanel>
                    <Action.SubmitForm 
                        title="Download Audio" 
                        onSubmit={handleSubmit} 
                    />
                </ActionPanel> 
            }
        >

            // Title for the form 
            <Form.Description
                title="Download YouTube Audio"
                text="Enter the YouTube video URL to download the audio as a .wav file. yt-dlp --dump-json 'https://www.youtube.com/watch?v=AX6OrbgS8lI'"
            />
            <Form.Separator />


            // input field for YouTube URL
            <Form.TextField 
                id="url" 
                title="YouTube URL" 
                placeholder="Enter the YouTube video URL"
                defaultValue="https://www.youtube.com/watch?v=AX6OrbgS8lI"
                onChange={handleUrlChanged}
                autoFocus
            />


            // get input type. only visible after submitting TextField
            <Form.Dropdown id="format" title="Audio Format">
            </Form.Dropdown>

        </Form>

    );
}