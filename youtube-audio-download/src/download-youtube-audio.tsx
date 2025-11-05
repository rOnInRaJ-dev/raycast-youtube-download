import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

interface Preferences {
    ytDlpPath: string;
    brewPath: string;
    downloadPath: string;
}



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
    vcodec: string;
    acodec: string;
    format: string;
    tbr: number;
}

export default function Command() {
    const preferences: Preferences = getPreferenceValues<Preferences>();
    const [audioFormats, setAudioFormats] = useState<YtFormat[]>([]);
    const [videoFormats, setVideoFormats] = useState<YtFormat[]>([]);
    const [loading, setLoading] = useState<boolean>(false);


    async function handleUrlChanged(newValue: string) {
        console.log("URL changed:", newValue);

        setLoading(true);

        const formats = await fetchFormatOptions(newValue);
        // console.log("Fetched formats:", formats);


        // Get both audio and video formats
        if (formats) {
            // AUDIO formats
            const audioFormats = formats.filter(format => 
                format.resolution === 'audio only' ||
                format.vcodec === 'none'
            );

            setAudioFormats(audioFormats);

            // debug each audio formats `format` and `ext` and `format_id`
            console.log(`found ${audioFormats.length} Audio formats:`);
            audioFormats.forEach(format => {
                console.log(`ID: ${format.format_id}, Ext: ${format.ext}, Note: ${format.format}`);
            });


            // VIDEO formats
            const videoFormats  = formats.filter(format => 
                format.vcodec !== 'none'
            );

            // debug each audio formats `format` and `ext` and `format_id`
            console.log(`found ${videoFormats.length} Video formats:`);
            videoFormats.forEach(format => {
                console.log(`ID: ${format.format_id}, Ext: ${format.ext}, Note: ${format.format}`);
            });
            setVideoFormats(videoFormats);

        }


        setLoading(false);
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
            // execute yt-dlp command to get video info in json
            const { stdout } = await execAsync(`${preferences.ytDlpPath} --dump-json "${url}"`);

            const videoInfo = JSON.parse(stdout);
            const formats: YtFormat[] = videoInfo.formats;


            // debug all formats in a table with format_id, ext, format_note, tbr
            console.log(`Found ${formats.length} formats`);
            formats.forEach(format => {
                console.log(`ID: ${format.format_id}, Ext: ${format.ext}, Note: ${format.format}, TBR: ${format.tbr}`);
            });
            


            // FILTER OUT Storyboard formats if the `format-id` starts with 'sb' 
            const filteredFormats = formats.filter(format => !format.format_id.startsWith('sb'));

            console.log(`Filtered formats ${filteredFormats.length} formats`);

            // filteredFormats.forEach(format => {
            //     console.log(`ID: ${format.format_id}, Ext: ${format.ext}, Note: ${format.format}, TBR: ${format.tbr}`);
            // });
            




            return filteredFormats;

            // filter only audio formats
            // const audioFormats = formats.filter(format => format.audio_ext && !format.video_ext);

            // console.log("Audio Formats:", audioFormats);
            // return audioFormats;

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

            {/* // Title for the form  */}
            <Form.Description
                title="Download YouTube Audio"
                text="Enter the YouTube video URL to download the audio as a .wav file. yt-dlp --dump-json 'https://www.youtube.com/watch?v=AX6OrbgS8lI'"
            />
            <Form.Separator />


            {/* // input field for YouTube URL */}
            <Form.TextField 
                id="url" 
                title="YouTube URL" 
                placeholder="Enter the YouTube video URL"
                defaultValue="https://www.youtube.com/watch?v=AX6OrbgS8lI"
                onChange={handleUrlChanged}
                autoFocus
            />


            {/* // get input type. only visible after submitting TextField */}
            <Form.Dropdown id="format" title="Format">
                {/* Audio only formats */}
                <Form.Dropdown.Section title="Audio Formats">

                </Form.Dropdown.Section>




                {/* Video only formats */}

            </Form.Dropdown>

        </Form>

    );
}