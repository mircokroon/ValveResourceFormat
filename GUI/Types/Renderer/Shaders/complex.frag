#version 460

#include "common/utils.glsl"
#include "common/rendermodes.glsl"
#include "common/features.glsl"
#include "common/ViewConstants.glsl"
#include "common/LightingConstants.glsl"
#include "complex_features.glsl"

// Render modes -- Switched on/off by code
#define renderMode_Diffuse 0
#define renderMode_Specular 0
#define renderMode_PBR 0
#define renderMode_Cubemaps 0
#define renderMode_Irradiance 0
#define renderMode_Tint 0
#define renderMode_Foliage_Params 0
#define renderMode_Terrain_Blend 0
#define renderMode_ExtraParams 0

#if defined(vr_complex_vfx) || defined(csgo_complex_vfx)
    #define complex_vfx_common
#elif defined(vr_simple_vfx) || defined(csgo_simple_vfx)
    #define simple_vfx_common
#elif defined(vr_simple_2way_blend_vfx) || defined (csgo_simple_2way_blend_vfx) || defined(steampal_2way_blend_mask_vfx)
    #define simple_blend_common
#elif defined(vr_glass_vfx) || defined(csgo_glass_vfx)
    #define glass_vfx_common
#elif defined(csgo_lightmappedgeneric_vfx) || defined(csgo_vertexlitgeneric_vfx)
    #define csgo_generic_vfx_common
#elif defined(vr_static_overlay_vfx) || defined(csgo_static_overlay_vfx)
    #define static_overlay_vfx_common
#endif

//Parameter defines - These are default values and can be overwritten based on material/model parameters
// BLENDING
#define F_FULLBRIGHT 0
#define F_LIT 0
#define F_UNLIT 0
#define F_ADDITIVE_BLEND 0
#define F_ALPHA_TEST 0
#define F_TRANSLUCENT 0
#define F_BLEND_MODE 0
#define F_GLASS 0
#define F_DISABLE_TONE_MAPPING 0
#define F_MORPH_SUPPORTED 0
#define F_WRINKLE 0
#define F_SCALE_NORMAL_MAP 0
// TEXTURING
#define F_TINT_MASK 0
#define F_FANCY_BLENDING 0
#define F_METALNESS_TEXTURE 0
#define F_AMBIENT_OCCLUSION_TEXTURE 0
#define F_FANCY_BLENDING 0
#define F_SELF_ILLUM 0
#define F_ENABLE_AMBIENT_OCCLUSION 0 // simple_2way_blend
#define F_ENABLE_TINT_MASKS 0 // simple_2way_blend
#define F_DECAL_TEXTURE 0
uniform int F_DECAL_BLEND_MODE;
// SHADING
#define F_SPECULAR 0
#define F_SPECULAR_INDIRECT 0
#define F_RETRO_REFLECTIVE 0
#define F_ANISOTROPIC_GLOSS 0
#define F_SPECULAR_CUBE_MAP_ANISOTROPIC_WARP 0 // only optional in HLA
#define F_SPHERICAL_PROJECTED_ANISOTROPIC_TANGENTS 0
#define F_CLOTH_SHADING 0
#define F_USE_BENT_NORMALS 0
#define F_DIFFUSE_WRAP 0
#define F_TRANSMISSIVE_BACKFACE_NDOTL 0 // todo
#define F_NO_SPECULAR_AT_FULL_ROUGHNESS 0
// SKIN
#define F_SUBSURFACE_SCATTERING 0 // todo, same preintegrated method as vr_skin in HLA
#define F_USE_FACE_OCCLUSION_TEXTURE 0 // todo, weird
#define F_USE_PER_VERTEX_CURVATURE 0 // todo
#define F_SSS_MASK 0 // todo

// vr_standard
#define F_HIGH_QUALITY_GLOSS 0
#define F_BLEND_NORMALS 0

#define HemiOctIsoRoughness_RG_B 0
//End of feature defines

in vec3 vFragPosition;
in vec3 vNormalOut;
centroid in vec3 vCentroidNormalOut;
in vec3 vTangentOut;
in vec3 vBitangentOut;
in vec2 vTexCoordOut;
in vec4 vVertexColorOut;

out vec4 outputColor;

uniform sampler2D g_tColor; // SrgbRead(true)
uniform sampler2D g_tNormal;
uniform sampler2D g_tTintMask;

#if (F_SECONDARY_UV == 1) || (F_FORCE_UV2 == 1)
    in vec2 vTexCoord2;
    uniform bool g_bUseSecondaryUvForAmbientOcclusion = true;
    #if F_TINT_MASK
        uniform bool g_bUseSecondaryUvForTintMask = true;
    #endif
    #if F_DETAIL_TEXTURE > 0
        uniform bool g_bUseSecondaryUvForDetailMask = true;
    #endif
    #if F_SELF_ILLUM == 1
        uniform bool g_bUseSecondaryUvForSelfIllum = false;
    #endif
#endif

#if defined(foliage_vfx_common)
    in vec3 vFoliageParamsOut;
#endif

#if defined(vr_complex_vfx)
    #define S_SPECULAR F_SPECULAR
#elif defined(csgo_generic_vfx_common)
    #define S_SPECULAR F_SPECULAR_INDIRECT
#elif defined(generic_vfx)
    #define S_SPECULAR 0
#else
    #define S_SPECULAR 1 // Indirect
#endif

#if (defined(csgo_generic_vfx_common) && F_LAYERS > 0)
    #define csgo_generic_blend
#endif

#if (defined(simple_blend_common) || defined(csgo_generic_blend) || defined(vr_standard_blend_vfx))
    #if !defined(steampal_2way_blend_mask_vfx)
        in vec4 vColorBlendValues;
    #endif
    uniform sampler2D g_tLayer2Color; // SrgbRead(true)
    uniform sampler2D g_tLayer2NormalRoughness;
    uniform vec4 g_vTexCoordScale2 = vec4(1.0);
#endif

#if defined(vr_skin_vfx)
    uniform sampler2D g_tCombinedMasks;
    uniform vec4 g_vTransmissionColor = vec4(0.74902, 0.231373, 0.011765, 0.0);
    uniform float g_flMouthInteriorBrightnessScale = 1.0;
#endif

#if (F_SELF_ILLUM == 1)
    #if !defined(vr_skin_vfx)
        uniform sampler2D g_tSelfIllumMask;
    #endif
    uniform float g_flSelfIllumAlbedoFactor = 0.0;
    uniform float g_flSelfIllumBrightness = 0.0;
    uniform float g_flSelfIllumScale = 1.0;
    uniform vec4 g_vSelfIllumScrollSpeed = vec4(0.0);
    uniform vec4 g_vSelfIllumTint = vec4(1.0);
#endif

#define _uniformMetalness (defined(simple_vfx_common) || defined(complex_vfx_common)) && (F_METALNESS_TEXTURE == 0)
#define _colorAlphaMetalness (defined(simple_vfx_common) || defined(complex_vfx_common)) && (F_METALNESS_TEXTURE == 1)
#define _colorAlphaAO (defined(vr_simple_vfx) && (F_AMBIENT_OCCLUSION_TEXTURE == 1) && (F_METALNESS_TEXTURE == 0)) || (F_ENABLE_AMBIENT_OCCLUSION == 1) // only vr_simple_vfx
#define _metalnessTexture (defined(complex_vfx_common) && (F_METALNESS_TEXTURE == 1) && ((F_RETRO_REFLECTIVE == 1) || (F_ALPHA_TEST == 1) || (F_TRANSLUCENT == 1))) || defined(csgo_weapon_vfx) || defined(csgo_character_vfx)
#define _ambientOcclusionTexture ( (defined(vr_simple_vfx) && (F_AMBIENT_OCCLUSION_TEXTURE == 1) && (F_METALNESS_TEXTURE == 1)) || defined(complex_vfx_common) || defined(csgo_foliage_vfx) || defined(csgo_weapon_vfx) || defined(csgo_character_vfx) || defined(csgo_generic_vfx_common))

#define unlit (defined(vr_unlit_vfx) || defined(unlit_vfx) || defined(csgo_unlitgeneric_vfx) || (F_FULLBRIGHT == 1) || (F_UNLIT == 1) || (defined(static_overlay_vfx_common) && F_LIT == 0))
#define alphatest (F_ALPHA_TEST == 1) || ((defined(csgo_unlitgeneric_vfx) || defined(static_overlay_vfx_common)) && (F_BLEND_MODE == 2))
#define translucent (F_TRANSLUCENT == 1) || (F_GLASS == 1) || defined(glass_vfx_common) || ((defined(csgo_unlitgeneric_vfx) || defined(static_overlay_vfx_common)) && (F_BLEND_MODE == 1)) // need to set this up on the cpu side
#define blendMod2x (F_BLEND_MODE == 3)

#if (alphatest == 1)
    uniform float g_flAlphaTestReference = 0.5;
#endif

#if (translucent == 1)
    uniform float g_flOpacityScale = 1.0;
#endif

#if defined(csgo_glass_vfx)
    uniform vec4 g_flTranslucencyRemap = vec4(0.0, 1.0, 0.0, 0.0);
#endif

#if (_uniformMetalness)
    uniform float g_flMetalness = 0.0;
#elif (_metalnessTexture)
    uniform sampler2D g_tMetalness;
#endif

#if (F_FANCY_BLENDING > 0)
    uniform sampler2D g_tBlendModulation;
    uniform float g_flBlendSoftness;
#endif

#if defined(simple_blend_common)
    uniform sampler2D g_tMask;
    uniform float g_flMetalnessA = 0.0;
    uniform float g_flMetalnessB = 0.0;

    #if defined(steampal_2way_blend_mask_vfx)
        uniform float g_BlendFalloff = 0.0;
        uniform float g_BlendHeight = 0.0;
    #endif
#endif

#if defined(vr_standard_vfx)
    #if (F_HIGH_QUALITY_GLOSS == 1)
        uniform sampler2D g_tGloss;
    #endif

    #if defined(vr_standard_blend_vfx)

        #if (F_SPECULAR == 1)
            // uniform sampler2D g_tColor1;
            uniform sampler2D g_tLayer1Color; // SrgbRead(true)
            #define VR_STANDARD_Color2 g_tLayer1Color
        #else
            uniform sampler2D g_tLayer1Color2; // SrgbRead(true)
            uniform sampler2D g_tLayer2Color2; // SrgbRead(true)
            #define VR_STANDARD_Color2 g_tLayer1Color2
        #endif

        uniform sampler2D g_tLayer1RevealMask;
        uniform float g_flLayer1BlendSoftness = 0.5;

        #if (F_BLEND_NORMALS == 1)
            uniform sampler2D g_tLayer1Normal;
        #endif
    #endif

#endif

#if (F_RETRO_REFLECTIVE == 1)
    uniform float g_flRetroReflectivity = 1.0;
#endif

#if (F_SCALE_NORMAL_MAP == 1)
    uniform float g_flNormalMapScaleFactor = 1.0;
#endif

#if defined(csgo_generic_vfx_common)
    uniform float g_flBumpStrength = 1.0;
#endif

#if (_ambientOcclusionTexture)
    uniform sampler2D g_tAmbientOcclusion;
#endif

#if (F_ANISOTROPIC_GLOSS == 1) // complex, csgo_character
    #define VEC2_ROUGHNESS
    #define renderMode_AnisoGloss 0
    uniform sampler2D g_tAnisoGloss;
#endif

#include "common/lighting_common.glsl"
#include "common/texturing.glsl"
#include "common/pbr.glsl"
#include "common/fog.glsl"

#if (S_SPECULAR == 1 || renderMode_Cubemaps == 1)
#include "common/environment.glsl"
#endif

// Must be last
#include "common/lighting.glsl"

// Get material properties
MaterialProperties_t GetMaterial(vec2 texCoord, vec3 vertexNormals)
{
    MaterialProperties_t mat;
    InitProperties(mat, vertexNormals);

    vec4 color = texture(g_tColor, texCoord);
    vec4 normalTexture = texture(g_tNormal, texCoord);

    // Blending
#if defined(csgo_generic_blend) || defined(simple_blend_common)  || defined(vr_standard_blend_vfx)
    vec2 texCoordB = texCoord * g_vTexCoordScale2.xy;

    #if defined(vr_standard_blend_vfx)
        vec4 color2 = texture(VR_STANDARD_Color2, texCoordB);
        vec4 normalTexture2 = normalTexture;
        #if (F_BLEND_NORMALS == 1)
            normalTexture2 = texture(g_tLayer1Normal, texCoordB);
        #endif
    #else
        vec4 color2 = texture(g_tLayer2Color, texCoordB);
        vec4 normalTexture2 = texture(g_tLayer2NormalRoughness, texCoordB);
    #endif

    // 0: VertexBlend 1: BlendModulateTexture,rg 2: NewLayerBlending,g 3: NewLayerBlending,a
    #if (defined(csgo_generic_vfx_common) && F_FANCY_BLENDING > 0)
        float blendFactor = vColorBlendValues.r;
        vec4 blendModTexel = texture(g_tBlendModulation, texCoordB);

        #if (F_FANCY_BLENDING == 1)
            blendFactor = ApplyBlendModulation(blendFactor, blendModTexel.g, blendModTexel.r);
        #elif (F_FANCY_BLENDING == 2)
            blendFactor = ApplyBlendModulation(blendFactor, blendModTexel.g, g_flBlendSoftness);
        #elif (F_FANCY_BLENDING == 3)
            blendFactor = ApplyBlendModulation(blendFactor, blendModTexel.a, g_flBlendSoftness);
        #endif
    #elif defined(steampal_2way_blend_mask_vfx)
        float blendFactor = texture(g_tMask, texCoordB).x;

        blendFactor = ApplyBlendModulation(blendFactor, g_BlendFalloff, g_BlendHeight);

    #elif (defined(simple_blend_common))
        float blendFactor = vColorBlendValues.r;
        vec4 blendModTexel = texture(g_tMask, texCoordB);

        #if defined(csgo_simple_2way_blend_vfx)
            float softnessPaint = vColorBlendValues.a;
        #else
            float softnessPaint = vColorBlendValues.g;
        #endif

        blendFactor = ApplyBlendModulation(blendFactor, blendModTexel.r, softnessPaint);
    #elif (defined(vr_standard_blend_vfx))
        float blendFactor = vColorBlendValues.r;
        vec4 blendModTexel = texture(g_tLayer1RevealMask, texCoordB);

        blendFactor = ApplyBlendModulation(blendFactor, blendModTexel.g, blendModTexel.r * g_flLayer1BlendSoftness);
    #else
        float blendFactor = vColorBlendValues.r;
    #endif

    #if (F_ENABLE_TINT_MASKS == 1)
        vec2 tintMasks = texture(g_tTintMask, texCoord).xy;

        vec3 tintFactorA = 1.0 - tintMasks.x * (1.0 - vVertexColorOut.rgb);
        vec3 tintFactorB = 1.0 - tintMasks.y * (1.0 - vVertexColorOut.rgb);

        color.rgb *= tintFactorA;
        color2.rgb *= tintFactorB;
    #endif

    color = mix(color, color2, blendFactor);
    // It's more correct to blend normals after decoding, but it's not actually how S2 does it
    normalTexture = mix(normalTexture, normalTexture2, blendFactor);
#endif

    // Vr_skin unique stuff
#if defined(vr_skin_vfx)
    // r=MouthMask, g=AO, b=selfillum/tint mask, a=SSS/opacity
    vec4 combinedMasks = texture(g_tCombinedMasks, texCoord);

    mat.ExtraParams.a = combinedMasks.x; // Mouth Mask
    mat.AmbientOcclusion = combinedMasks.y;

    #if (F_SELF_ILLUM)
        float selfIllumMask = combinedMasks.z;
    #elif (F_TINT_MASK)
        float flTintMask = combinedMasks.z;
    #endif

    #if (F_SSS_MASK == 1)
        mat.SSSMask = combinedMasks.a;
    #endif

    #if (translucent == 1) || (alphatest == 1)
        mat.Opacity = combinedMasks.a;
    #endif
#endif

#if defined(csgo_character_vfx)
    #if (F_SUBSURFACE_SCATTERING == 1)
        //mat.SSSMask = texture(g_tSSSMask, texCoord).g;
    #endif
#endif

    mat.Albedo = color.rgb;

#if (translucent == 1) || (alphatest == 1)
    mat.Opacity = color.a;
#endif

#if defined(static_overlay_vfx_common) && (F_PAINT_VERTEX_COLORS == 1)
    mat.Albedo *= vVertexColorOut.rgb;
    mat.Opacity *= vVertexColorOut.a;
#endif


#if (translucent == 1)
    mat.Opacity *= g_flOpacityScale;
#endif

    // Alpha test
#if (alphatest == 1)
    mat.Opacity = AlphaTestAntiAliasing(mat.Opacity, texCoord);

    if (mat.Opacity - 0.001 < g_flAlphaTestReference)   discard;
#endif

    // Tinting
#if (F_ENABLE_TINT_MASKS == 0)
    vec3 tintColor = vVertexColorOut.rgb;

    #if (F_TINT_MASK == 1)
        #if (F_SECONDARY_UV == 1) || (F_FORCE_UV2 == 1)
            vec2 tintMaskTexcoord = (g_bUseSecondaryUvForTintMask || (F_FORCE_UV2 == 1)) ? vTexCoord2 : texCoord;
        #else
            vec2 tintMaskTexcoord = texCoord;
        #endif
        float tintStrength = texture(g_tTintMask, tintMaskTexcoord).x;
        tintColor = 1.0 - tintStrength * (1.0 - tintColor.rgb);
    #endif

    mat.Albedo *= tintColor;
#endif


    // Normals and Roughness
    mat.NormalMap = DecodeNormal(normalTexture);

#if (F_ANISOTROPIC_GLOSS == 1)
    mat.RoughnessTex = texture(g_tAnisoGloss, texCoord).rg;
#else
    mat.RoughnessTex = normalTexture.b;

    #if defined(vr_standard_vfx)
        #if (F_HIGH_QUALITY_GLOSS == 1)
            mat.RoughnessTex = texture(g_tGloss, texCoord).g;
        #endif
    #endif

#endif


#if (F_SCALE_NORMAL_MAP == 1)
    mat.NormalMap = normalize(mix(vec3(0, 0, 1), mat.NormalMap, g_flNormalMapScaleFactor));
#elif defined(csgo_generic_vfx_common)
    mat.NormalMap = normalize(mix(vec3(0, 0, 1), mat.NormalMap, g_flBumpStrength));
#endif


    // Detail texture
#if (F_DETAIL_TEXTURE > 0)
    #if (F_SECONDARY_UV == 1) || (F_FORCE_UV2 == 1)
        vec2 detailMaskCoords = (g_bUseSecondaryUvForDetailMask || (F_FORCE_UV2 == 1)) ? vTexCoord2 : texCoord;
    #else
        vec2 detailMaskCoords = texCoord;
    #endif
    applyDetailTexture(mat.Albedo, mat.NormalMap, detailMaskCoords);
#endif

    mat.Normal = calculateWorldNormal(mat.NormalMap, mat.GeometricNormal, mat.Tangent, mat.Bitangent);

    // Metalness
#if (_metalnessTexture)
    // a = rimmask
    vec4 metalnessTexture = texture(g_tMetalness, texCoord);

    mat.Metalness = metalnessTexture.g;

    #if (F_RETRO_REFLECTIVE == 1)
        // not exclusive to csgo_character
        mat.ExtraParams.x = metalnessTexture.r;
    #endif
    #if defined(csgo_character_vfx)
        mat.ClothMask = metalnessTexture.b * (1.0 - metalnessTexture.g);
    #elif defined(csgo_weapon_vfx)
        mat.RoughnessTex = metalnessTexture.r;
    #endif
#elif (_uniformMetalness)
    mat.Metalness = g_flMetalness;
#elif (_colorAlphaMetalness)
    mat.Metalness = color.a;
#elif defined(simple_blend_common)
    mat.Metalness = mix(g_flMetalnessA, g_flMetalnessB, blendFactor);
#endif

    // Ambient Occlusion
#if (_colorAlphaAO)
    mat.AmbientOcclusion = color.a;
#elif (_ambientOcclusionTexture)
    #if (F_SECONDARY_UV == 1) || (F_FORCE_UV2 == 1)
        mat.AmbientOcclusion = texture(g_tAmbientOcclusion, (g_bUseSecondaryUvForAmbientOcclusion || (F_FORCE_UV2 == 1)) ? vTexCoord2 : texCoord).r;
    #else
        mat.AmbientOcclusion = texture(g_tAmbientOcclusion, texCoord).r;
    #endif
#endif

#if defined(vr_complex_vfx) && (F_METALNESS_TEXTURE == 0) && (F_RETRO_REFLECTIVE == 1)
    mat.ExtraParams.x = g_flRetroReflectivity;
#endif
#if defined(vr_complex_vfx) && (F_CLOTH_SHADING == 1)
    mat.ClothMask = 1.0;
#endif

    mat.Roughness = AdjustRoughnessByGeometricNormal(mat.RoughnessTex, mat.GeometricNormal);

#if (F_USE_BENT_NORMALS == 1)
    GetBentNormal(mat, texCoord);
#else
    mat.AmbientNormal = mat.Normal;
    mat.AmbientGeometricNormal = mat.GeometricNormal;
#endif


#if (F_DECAL_TEXTURE == 1)
    mat.Albedo = ApplyDecalTexture(mat.Albedo);
#endif

    mat.DiffuseColor = mat.Albedo - mat.Albedo * mat.Metalness;

#if (F_CLOTH_SHADING == 1) && defined(csgo_character_vfx)
    vec3 F0 = ApplySheen(0.04, mat.Albedo, mat.ClothMask);
#else
    const vec3 F0 = vec3(0.04);
#endif
    mat.SpecularColor = mix(F0, mat.Albedo, mat.Metalness);

    // Self illum
    #if (F_SELF_ILLUM == 1) && !defined(vr_xen_foliage_vfx) // xen foliage has really complicated selfillum and is wrong with this code
        #if (F_SECONDARY_UV == 1) || (F_FORCE_UV2 == 1)
            vec2 selfIllumCoords = (g_bUseSecondaryUvForSelfIllum || (F_FORCE_UV2 == 1)) ? vTexCoord2 : texCoord;
        #else
            vec2 selfIllumCoords = texCoord;
        #endif

        selfIllumCoords += fract(g_vSelfIllumScrollSpeed.xy * g_flTime);

        #if !defined(vr_skin_vfx)
            float selfIllumMask = texture(g_tSelfIllumMask, selfIllumCoords).r; // is this float or rgb?
        #endif

        vec3 selfIllumScale = (exp2(g_flSelfIllumBrightness) * g_flSelfIllumScale) * SrgbGammaToLinear(g_vSelfIllumTint.rgb);
        mat.IllumColor = selfIllumScale * selfIllumMask * mix(vec3(1.0), mat.Albedo, g_flSelfIllumAlbedoFactor);
    #endif

    #if defined(vr_skin_vfx)
        mat.TransmissiveColor = SrgbGammaToLinear(g_vTransmissionColor.rgb) * color.a;

        float mouthOcclusion = mix(1.0, g_flMouthInteriorBrightnessScale, mat.ExtraParams.a);
        mat.TransmissiveColor *= mouthOcclusion;
        mat.AmbientOcclusion *= mouthOcclusion;
    #endif

    #if (F_GLASS == 1) || defined(vr_glass_vfx)
        vec4 glassResult = GetGlassMaterial(mat);
        mat.Albedo = glassResult.rgb;
        mat.Opacity = glassResult.a;
    #endif

    #if defined(csgo_glass_vfx)
        mat.Opacity = mix(g_flTranslucencyRemap.x, g_flTranslucencyRemap.y, mat.Opacity);
    #endif

    mat.DiffuseAO = vec3(mat.AmbientOcclusion);
    mat.SpecularAO = mat.AmbientOcclusion;

#if (F_ANISOTROPIC_GLOSS == 1)
    CalculateAnisotropicTangents(mat);
#endif

    return mat;
}

// MAIN

void main()
{
    vec3 vertexNormal = SwitchCentroidNormal(vNormalOut, vCentroidNormalOut);
    vec2 texCoord = vTexCoordOut;

    // Get material
    MaterialProperties_t mat = GetMaterial(texCoord, vertexNormal);
    outputColor.a = mat.Opacity;

    LightingTerms_t lighting = InitLighting();

#if (unlit == 1)
    outputColor.rgb = mat.Albedo;
#else
    CalculateDirectLighting(lighting, mat);
    CalculateIndirectLighting(lighting, mat);

    // Combining pass

    ApplyAmbientOcclusion(lighting, mat);

    vec3 diffuseLighting = lighting.DiffuseDirect + lighting.DiffuseIndirect;
    vec3 specularLighting = lighting.SpecularDirect + lighting.SpecularIndirect;

    #if F_NO_SPECULAR_AT_FULL_ROUGHNESS == 1
        specularLighting = (mat.Roughness == 1.0) ? vec3(0) : specularLighting;
    #endif

    #if defined(S_TRANSMISSIVE_BACKFACE_NDOTL)
        vec3 transmissiveLighting = o.TransmissiveDirect * mat.TransmissiveColor;
    #else
        const vec3 transmissiveLighting = vec3(0.0);
    #endif

    // Unique HLA Membrane blend mode: specular unaffected by opacity
    #if defined(vr_complex_vfx) && (F_TRANSLUCENT == 2)
        vec3 combinedLighting = specularLighting + (mat.DiffuseColor * diffuseLighting + transmissiveLighting + mat.IllumColor) * mat.Opacity;
        outputColor.a = 1.0;
    #else
        vec3 combinedLighting = mat.DiffuseColor * diffuseLighting + specularLighting + transmissiveLighting + mat.IllumColor;
    #endif

    outputColor.rgb = combinedLighting;
#endif

    ApplyFog(outputColor.rgb, mat.PositionWS);

#if (F_DISABLE_TONE_MAPPING == 0)
    outputColor.rgb = SrgbLinearToGamma(outputColor.rgb);
#endif

#if blendMod2x == 1
    outputColor = vec4(mix(vec3(0.5), outputColor.rgb, vec3(outputColor.a)), outputColor.a);
#endif

#if renderMode_FullBright == 1
    vec3 fullbrightLighting = CalculateFullbrightLighting(mat.Albedo, mat.Normal, mat.ViewDir);
    outputColor.rgb = SrgbLinearToGamma(fullbrightLighting);
#endif

#if renderMode_Color == 1
    outputColor = vec4(SrgbLinearToGamma(mat.Albedo), 1.0);
#endif

#if renderMode_BumpMap == 1
    outputColor = vec4(PackToColor(mat.NormalMap), 1.0);
#endif

#if renderMode_Tangents == 1
    outputColor = vec4(PackToColor(mat.Tangent), 1.0);
#endif

#if renderMode_Normals == 1
    outputColor = vec4(PackToColor(mat.GeometricNormal), 1.0);
#endif

#if renderMode_BumpNormals == 1
    outputColor = vec4(PackToColor(mat.Normal), 1.0);
#endif

#if (renderMode_Diffuse == 1) && (unlit != 1)
    outputColor.rgb = SrgbLinearToGamma(diffuseLighting * 0.5);
#endif

#if (renderMode_Specular == 1) && (unlit != 1)
    outputColor.rgb = SrgbLinearToGamma(specularLighting);
#endif

#if renderMode_PBR == 1
    outputColor = vec4(mat.AmbientOcclusion, GetIsoRoughness(mat.Roughness), mat.Metalness, 1.0);
#endif

#if (renderMode_Cubemaps == 1)
    // No bumpmaps, full reflectivity
    vec3 viewmodeEnvMap = GetEnvironment(mat).rgb;
    outputColor.rgb = SrgbLinearToGamma(viewmodeEnvMap);
#endif

#if renderMode_Illumination == 1
    outputColor = vec4(SrgbLinearToGamma(lighting.DiffuseDirect + lighting.SpecularDirect), 1.0);
#endif

#if renderMode_Irradiance == 1 && (F_GLASS == 0)
    outputColor = vec4(SrgbLinearToGamma(lighting.DiffuseIndirect), 1.0);
#endif

#if renderMode_Tint == 1
    outputColor = vVertexColorOut;
#endif

#if renderMode_Foliage_Params == 1 && defined(foliage_vfx_common)
    outputColor.rgb = vFoliageParamsOut.rgb;
#endif

#if renderMode_Terrain_Blend == 1 && (defined(csgo_generic_blend) || defined(simple_blend_common) || defined(vr_standard_blend_vfx))
    outputColor.rgb = vColorBlendValues.rgb;
#endif

#if renderMode_ExtraParams == 1
    outputColor.rgb = mat.ExtraParams.rgb;
#endif
#if renderMode_AnisoGloss == 1
    outputColor.rgb = vec3(mat.RoughnessTex.xy, 0.0);
#endif
}
