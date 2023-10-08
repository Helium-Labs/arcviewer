import { z } from "zod";
export var ARCStandard;
(function (ARCStandard) {
    ARCStandard["ARC3"] = "ARC3";
    ARCStandard["ARC19"] = "ARC19";
    ARCStandard["ARC69"] = "ARC69";
    ARCStandard["CUSTOM"] = "CUSTOM";
})(ARCStandard || (ARCStandard = {}));
export const image_mimetypeZod = z.union([
    z.literal("image/apng"),
    z.literal("image/avif"),
    z.literal("image/gif"),
    z.literal("image/jpeg"),
    z.literal("image/png"),
    z.literal("image/svg+xml"),
    z.literal("image/webp"),
]);
export const animation_url_mimetypeZod = z.union([
    z.literal("model/gltf-binary"),
    z.literal("model/gltf+json"),
    z.literal("video/webm"),
    z.literal("video/mp4"),
    z.literal("video/m4v"),
    z.literal("video/ogg"),
    z.literal("video/ogv"),
    z.literal("audio/mpeg"),
    z.literal("audio/mp3"),
    z.literal("audio/wav"),
    z.literal("audio/ogg"),
    z.literal("audio/oga"),
    z.literal("application/pdf"),
    z.literal("text/html"),
]);
export const Arc69MetadataZod = z
    .object({
    standard: z.literal("arc69"),
    description: z.string().optional(),
    external_url: z.string().optional(),
    media_url: z.string().optional(),
    properties: z.record(z.string(), z.any()).optional(),
    mime_type: z
        .union([image_mimetypeZod, animation_url_mimetypeZod])
        .optional(),
    media_integrity: z.string().optional(),
    attributes: z
        .array(z.object({
        trait_type: z.string(),
        value: z.union([z.string(), z.number()]),
        display_type: z.string().optional(),
        max_value: z.number().optional(),
        probability: z.number().optional(),
    }))
        .optional(),
})
    .catchall(z.unknown());
