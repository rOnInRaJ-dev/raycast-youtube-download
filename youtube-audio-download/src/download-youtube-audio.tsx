import { Form, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";
import { format } from "path";

const execAsync = promisify(exec);

interface Preferences {
    ytDlpPath: string;
    brewPath: string;
    downloadPath: string;
    ffmpegPath: string;
    ffprobePath: string;
}

// --audio-format FORMAT           Format to convert the audio to when -x is
//                                 used. (currently supported: best (default),
//                                 aac, alac, flac, m4a, mp3, opus, vorbis,
//                                 wav).
const audioExportFormats = [
    { key: "wav", title: "WAV" },
    { key: "mp3", title: "MP3" },
    { key: "m4a", title: "M4A" },
    { key: "flac", title: "FLAC" },
    { key: "aac", title: "AAC" },
    { key: "opus", title: "OPUS" },
    { key: "vorbis", title: "VORBIS" },
    { key: "alac", title: "ALAC" },
];

type Values = {
    url: string;
    audioExportFormat?: string;
    format: string;
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
    format_note: string;
    tbr: number;
}

const url_title: string = "";

export default function Command() {
    const preferences: Preferences = getPreferenceValues<Preferences>();


    const [audioFormats, setAudioFormats] = useState<YtFormat[]>([]);
    const [videoFormats, setVideoFormats] = useState<YtFormat[]>([]);
    const [formats, setFormats] = useState<YtFormat[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [audioOnly, setAudioOnly] = useState<boolean>(false);
    const [title, setTitle] = useState<string>("");



    // function to handle URL change
    async function handleUrlChanged(newValue: string) {
        console.log("URL changed:", newValue);

        setLoading(true);

        // empty previous formats
        setFormats([]);
        setAudioFormats([]);
        setVideoFormats([]);

        const formats = await fetchFormatOptions(newValue);
        // console.log("Fetched formats:", formats);


        // Get both audio and video formats
        if (formats) {
            setFormats(formats);


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
    async function handleSubmit(values: Values) {
        console.log(values.url);
        showToast({ 
            title: "Downloading audio...", 
            message: `URL: ${values.url}` 
        });


        // DOWNLOAD Logic here

        // format selection
        // audioonly mode
        // audio export format selection

        const toast = await showToast({ 
            style: Toast.Style.Animated,
            title: "Downloading audio...",
            message: `URL: ${values.url}` 
        });
        try{

            const options: string[] = [];
            options.push(`--ffmpeg-location "${preferences.ffmpegPath}"`);

            if(audioOnly) {
                console.log("Audio Only Mode. Export Format:", values.audioExportFormat);

                // yt-dlp -x --audio-format wav "https://youtu.be/AX6OrbgS8lI" EXAMPLE SCRIPT
                options.push(`-x`);
                options.push(`--audio-format ${values.audioExportFormat}`);
                options.push(`-o "${preferences.downloadPath}/${title}.${values.audioExportFormat}"`); // output path   


                // const script = `${preferences.ytDlpPath} -x --audio-format ${values.audioExportFormat} -o "${preferences.downloadPath}/${title}.${values.audioExportFormat}" "${values.url}"`;
                // console.log("Executing script:", script);


            
                // const { stdout } = await execAsync(script);
                // console.log("Download Output:", stdout);


            } else {
                console.log("Video + Audio Mode");
                const ext = formats.find(f => f.format_id === values.format)?.ext || "mp4";

                options.push(`-o "${preferences.downloadPath}/${title}.${ext}"`); // output path
            }
            

            options.push(`-f ${values.format}`); // format id
            options.push(`"${values.url}"`); // video url

            const command = `${preferences.ytDlpPath} ${options.join(' ')}`;
            console.log("Executing command:", command);

            const { stdout } = await execAsync(`${preferences.ytDlpPath} ${options.join(' ')}`);
            console.log("Download Output:", stdout);

            toast.style = Toast.Style.Success;
            toast.title = "Download completed";
        }
        catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Download failed"; 
            console.error("Error during download:", error);
        }

    }

    // function to fetch available format options using yt-dlp with this command:
// yt-dlp --dump-json "https://www.youtube.com/watch?v=AX6OrbgS8lI" | jq '.' > formats.json
    async function fetchFormatOptions (url: string) {
        if (!url) return;

        // Toast loading
        const toast = await showToast({
            style: Toast.Style.Animated,
            title: `Processing URL: ${url}`,
        });


        try{
            // execute yt-dlp command to get video info in json
            const { stdout } = await execAsync(`${preferences.ytDlpPath} --dump-json "${url}"`);

            const videoInfo = JSON.parse(stdout);
            const formats: YtFormat[] = videoInfo.formats;


            // debug all formats in a table with format_id, ext, format_note, tbr
            // console.log(`Found ${formats.length} formats`);
            // formats.forEach(format => {
            //     console.log(`ID: ${format.format_id}, Ext: ${format.ext}, Note: ${format.format}, TBR: ${format.tbr}`);
            // });
            


            // FILTER OUT Storyboard formats if the `format-id` starts with 'sb' 
            const filteredFormats = formats.filter(format => !format.format_id.startsWith('sb'));

            console.log(`Filtered formats ${filteredFormats.length} formats`);

            // filteredFormats.forEach(format => {
            //     console.log(`ID: ${format.format_id}, Ext: ${format.ext}, Note: ${format.format}, TBR: ${format.tbr}`);
            // });
            



            // get the title of the video
            setTitle(videoInfo.title);
            console.log("Video Title updated:", videoInfo.title);

            // update toast
            toast.style = Toast.Style.Success;
            toast.title = "Format options fetched";

            return filteredFormats;
        }
        catch (error) {
            toast.style = Toast.Style.Failure;
            toast.title = "Failed to fetch format options";
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

            {/* Toggle for audio only mode */}
            <Form.Checkbox
                id="audioOnly"
                label="Audio Only"
                value={audioOnly}
                onChange={setAudioOnly}
            />

            <Form.Separator />



        
            {/* // get input type. only visible after submitting TextField */}
            <Form.Dropdown id="format" title="Format" isLoading={loading}>
                {/* Audio only formats */}
                <Form.Dropdown.Section title="Audio Formats">
                    {audioFormats.map((f) => (
                        <Form.Dropdown.Item 
                            key={f.format_id} 
                            value={f.format_id} 
                            title={`${f.ext} | ${f.resolution} | ${f.format_note}`} 
                        />
                    ))}

                </Form.Dropdown.Section>


                {/* Video only formats */}
                {!audioOnly && (
                    <Form.Dropdown.Section title="Video Formats">
                        {videoFormats.map((f) => (
                            <Form.Dropdown.Item 
                                key={f.format_id} 
                                value={f.format_id} 
                                title={`${f.ext} | ${f.tbr}kbps | ${f.resolution}`} 
                            />
                        ))}
                    </Form.Dropdown.Section>
                )}

            </Form.Dropdown>



            {/* AUDIO ONLY MODE */}
            {/* GET THE AUDIO ONLY MODE exporting format */}


            {audioOnly &&  (

                <Form.Dropdown 
                    id="audioExportFormat" 
                    title="Audio Export Format" 
                    isLoading={loading}
                >
                    {audioExportFormats.map((f) => (
                        <Form.Dropdown.Item
                            key={f.key}
                            value={f.key}
                            title={f.title}
                        />
                    ))}
                </Form.Dropdown>
            )}






        </Form>

    );
}