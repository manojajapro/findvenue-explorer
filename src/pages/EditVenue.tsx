import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Icons } from '@/components/Icons';
import { Slider } from '@/components/ui/slider';
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Progress } from "@/components/ui/progress"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AspectRatio } from "@/components/ui/aspect-ratio"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { XCircle } from "lucide-react"
import { InputTag } from "@/components/ui/input-tag"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DataTable } from "@/components/ui/data-table"
import { Dropzone } from "@/components/dropzone"
import { MultiSelect } from "@/components/multi-select"
import { InputRules } from "@/components/input-rules"
import { InputMultiLine } from "@/components/input-multi-line"
import { InputCurrency } from "@/components/input-currency"
import { InputNumber } from "@/components/input-number"
import { InputPercentage } from "@/components/input-percentage"
import { InputPhone } from "@/components/input-phone"
import { InputEmail } from "@/components/input-email"
import { InputPassword } from "@/components/input-password"
import { InputSearch } from "@/components/input-search"
import { InputUrl } from "@/components/input-url"
import { InputColor } from "@/components/input-color"
import { InputDate } from "@/components/input-date"
import { InputTime } from "@/components/input-time"
import { InputDateTime } from "@/components/input-date-time"
import { InputMonth } from "@/components/input-month"
import { InputWeek } from "@/components/input-week"
import { InputRange } from "@/components/input-range"
import { InputRating } from "@/components/input-rating"
import { InputFile } from "@/components/input-file"
import { InputImage } from "@/components/input-image"
import { InputVideo } from "@/components/input-video"
import { InputAudio } from "@/components/input-audio"
import { InputLocation } from "@/components/input-location"
import { InputMap } from "@/components/input-map"
import { InputCode } from "@/components/input-code"
import { InputMarkdown } from "@/components/input-markdown"
import { InputRichText } from "@/components/input-rich-text"
import { InputJson } from "@/components/input-json"
import { InputYaml } from "@/components/input-yaml"
import { InputXml } from "@/components/input-xml"
import { InputCsv } from "@/components/input-csv"
import { InputList } from "@/components/input-list"
import { InputTable } from "@/components/input-table"
import { InputTree } from "@/components/input-tree"
import { InputSignature } from "@/components/input-signature"
import { InputQRCode } from "@/components/input-qrcode"
import { InputBarcode } from "@/components/input-barcode"
import { InputCreditCard } from "@/components/input-credit-card"
import { InputSocial } from "@/components/input-social"
import { InputMentions } from "@/components/input-mentions"
import { InputEmoji } from "@/components/input-emoji"
import { InputSticker } from "@/components/input-sticker"
import { InputCommandPalette } from "@/components/input-command-palette"
import { InputHotkey } from "@/components/input-hotkey"
import { InputCounter } from "@/components/input-counter"
import { InputStepper } from "@/components/input-stepper"
import { InputProgress } from "@/components/input-progress"
import { InputTimer } from "@/components/input-timer"
import { InputStopwatch } from "@/components/input-stopwatch"
import { InputCalculator } from "@/components/input-calculator"
import { InputTransfer } from "@/components/input-transfer"
import { InputRatingStars } from "@/components/input-rating-stars"
import { InputRatingThumbs } from "@/components/input-rating-thumbs"
import { InputRatingHeart } from "@/components/input-rating-heart"
import { InputRatingSmile } from "@/components/input-rating-smile"
import { InputRatingTrophy } from "@/components/input-rating-trophy"
import { InputRatingDiamond } from "@/components/input-rating-diamond"
import { InputRatingLikeDislike } from "@/components/input-rating-like-dislike"
import { InputRatingYesNo } from "@/components/input-rating-yes-no"
import { InputRatingTrueFalse } from "@/components/input-rating-true-false"
import { InputRatingOnOff } from "@/components/input-rating-on-off"
import { InputRatingCheckUncheck } from "@/components/input-rating-check-uncheck"
import { InputRatingPlusMinus } from "@/components/input-rating-plus-minus"
import { InputRatingArrow } from "@/components/input-rating-arrow"
import { InputRatingCircle } from "@/components/input-rating-circle"
import { InputRatingSquare } from "@/components/input-rating-square"
import { InputRatingTriangle } from "@/components/input-rating-triangle"
import { InputRatingStarHalf } from "@/components/input-rating-star-half"
import { InputRatingCustom } from "@/components/input-rating-custom"
import { InputRatingEmoji } from "@/components/input-rating-emoji"
import { InputRatingImage } from "@/components/input-rating-image"
import { InputRatingVideo } from "@/components/input-rating-video"
import { InputRatingAudio } from "@/components/input-rating-audio"
import { InputRatingLocation } from "@/components/input-rating-location"
import { InputRatingMap } from "@/components/input-rating-map"
import { InputRatingCode } from "@/components/input-rating-code"
import { InputRatingMarkdown } from "@/components/input-rating-markdown"
import { InputRatingRichText } from "@/components/input-rating-rich-text"
import { InputRatingJson } from "@/components/input-rating-json"
import { InputRatingYaml } from "@/components/input-rating-yaml"
import { InputRatingXml } from "@/components/input-rating-xml"
import { InputRatingCsv } from "@/components/input-rating-csv"
import { InputRatingList } from "@/components/input-rating-list"
import { InputRatingTable } from "@/components/input-rating-table"
import { InputRatingTree } from "@/components/input-rating-tree"
import { InputRatingSignature } from "@/components/input-rating-signature"
import { InputRatingQRCode } from "@/components/input-rating-qrcode"
import { InputRatingBarcode } from "@/components/input-rating-barcode"
import { InputRatingCreditCard } from "@/components/input-rating-credit-card"
import { InputRatingSocial } from "@/components/input-rating-social"
import { InputRatingMentions } from "@/components/input-rating-mentions"
import { InputRatingSticker } from "@/components/input-rating-sticker"
import { InputRatingInputCommandPalette } from "@/components/input-rating-input-command-palette"
import { InputRatingInputHotkey } from "@/components/input-rating-input-hotkey"
import { InputRatingInputCounter } from "@/components/input-rating-input-counter"
import { InputRatingInputStepper } from "@/components/input-rating-input-stepper"
import { InputRatingInputProgress } from "@/components/input-rating-input-progress"
import { InputRatingInputTimer } from "@/components/input-rating-input-timer"
import { InputRatingInputStopwatch } from "@/components/input-rating-input-stopwatch"
import { InputRatingInputCalculator } from "@/components/input-rating-input-calculator"
import { InputRatingInputTransfer } from "@/components/input-rating-input-transfer"
import { InputRatingInputEmoji } from "@/components/input-rating-input-emoji"
import { InputRatingInputImage } from "@/components/input-rating-input-image"
import { InputRatingInputVideo } from "@/components/input-rating-input-video"
import { InputRatingInputAudio } from "@/components/input-rating-input-audio"
import { InputRatingInputLocation } from "@/components/input-rating-input-location"
import { InputRatingInputMap } from "@/components/input-rating-input-map"
import { InputRatingInputCode } from "@/components/input-rating-input-code"
import { InputRatingInputMarkdown } from "@/components/input-rating-input-markdown"
import { InputRatingInputRichText } from "@/components/input-rating-input-rich-text"
import { InputRatingInputJson } from "@/components/input-rating-input-json"
import { InputRatingInputYaml } from "@/components/input-rating-input-yaml"
import { InputRatingInputXml } from "@/components/input-rating-input-xml"
import { InputRatingInputCsv } from "@/components/input-rating-input-csv"
import { InputRatingInputList } from "@/components/input-rating-input-list"
import { InputRatingInputTable } from "@/components/input-rating-input-table"
import { InputRatingInputTree } from "@/components/input-rating-input-tree"
import { InputRatingInputSignature } from "@/components/input-rating-input-signature"
import { InputRatingInputQRCode } from "@/components/input-rating-input-qrcode"
import { InputRatingInputBarcode } from "@/components/input-rating-input-barcode"
import { InputRatingInputCreditCard } from "@/components/input-rating-input-credit-card"
import { InputRatingInputSocial } from "@/components/input-rating-input-social"
import { InputRatingInputMentions } from "@/components/input-rating-input-mentions"
import { InputRatingInputSticker } from "@/components/input-rating-input-sticker"
import { InputRatingInputCommandPaletteInput } from "@/components/input-rating-input-command-palette-input"
import { InputRatingInputHotkeyInput } from "@/components/input-rating-input-hotkey-input"
import { InputRatingInputCounterInput } from "@/components/input-rating-input-counter-input"
import { InputRatingInputStepperInput } from "@/components/input-rating-input-stepper-input"
import { InputRatingInputProgressInput } from "@/components/input-rating-input-progress-input"
import { InputRatingInputTimerInput } from "@/components/input-rating-input-timer-input"
import { InputRatingInputStopwatchInput } from "@/components/input-rating-input-stopwatch-input"
import { InputRatingInputCalculatorInput } from "@/components/input-rating-input-calculator-input"
import { InputRatingInputTransferInput } from "@/components/input-rating-input-transfer-input"
import { InputRatingInputEmojiInput } from "@/components/input-rating-input-emoji-input"
import { InputRatingInputImageInput } from "@/components/input-rating-input-image-input"
import { InputRatingInputVideoInput } from "@/components/input-rating-input-video-input"
import { InputRatingInputAudioInput } from "@/components/input-rating-input-audio-input"
import { InputRatingInputLocationInput } from "@/components/input-rating-input-location-input"
import { InputRatingInputMapInput } from "@/components/input-rating-input-map-input"
import { InputRatingInputCodeInput } from "@/components/input-rating-input-code-input"
import { InputRatingInputMarkdownInput } from "@/components/input-rating-input-markdown-input"
import { InputRatingInputRichTextInput } from "@/components/input-rating-input-rich-text-input"
import { InputRatingInputJsonInput } from "@/components/input-rating-input-json-input"
import { InputRatingInputYamlInput } from "@/components/input-rating-input-yaml-input"
import { InputRatingInputXmlInput } from "@/components/input-rating-input-xml-input"
import { InputRatingInputCsvInput } from "@/components/input-rating-input-csv-input"
import { InputRatingInputListInput } from "@/components/input-rating-input-list-input"
import { InputRatingInputTableInput } from "@/components/input-rating-input-table-input"
import { InputRatingInputTreeInput } from "@/components/input-rating-input-tree-input"
import { InputRatingInputSignatureInput } from "@/components/input-rating-input-signature-input"
import { InputRatingInputQRCodeInput } from "@/components/input-rating-input-qrcode-input"
import { InputRatingInputBarcodeInput } from "@/components/input-rating-input-barcode-input"
import { InputRatingInputCreditCardInput } from "@/components/input-rating-input-credit-card-input"
import { InputRatingInputSocialInput } from "@/components/input-rating-input-social-input"
import { InputRatingInputMentionsInput } from "@/components/input-rating-input-mentions-input"
import { InputRatingInputStickerInput } from "@/components/input-rating-input-sticker-input"

const formSchema = z.object({
  name: z.string().min(2, {
    message: 'Venue name must be at least 2 characters.',
  }),
  description: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  address: z.string().min(5, {
    message: 'Address must be at least 5 characters.',
  }),
  city: z.string().min(2, {
    message: 'City must be at least 2 characters.',
  }),
  state: z.string().min(2, {
    message: 'State must be at least 2 characters.',
  }),
  zip_code: z.string().min(5, {
    message: 'Zip code must be at least 5 characters.',
  }),
  phone_number: z.string().min(10, {
    message: 'Phone number must be at least 10 characters.',
  }),
  email: z.string().email({
    message: 'Invalid email address.',
  }),
  website: z.string().url({
    message: 'Invalid website URL.',
  }),
  capacity: z.number().min(1, {
    message: 'Capacity must be at least 1.',
  }),
  price_per_hour: z.number().min(1, {
    message: 'Price per hour must be at least 1.',
  }),
  opening_hours: z.string().min(5, {
    message: 'Opening hours must be at least 5 characters.',
  }),
  closing_hours: z.string().min(5, {
    message: 'Closing hours must be at least 5 characters.',
  }),
  amenities: z.array(z.string()).optional(),
  accessibility_features: z.array(z.string()).optional(),
  accepted_payment_methods: z.array(z.string()).optional(),
  additional_services: z.array(z.string()).optional(),
  category_id: z.array(z.string()).optional(),
  category_name: z.array(z.string()).optional(),
  gallery_images: z.array(z.string()).optional(),
  rules_and_regulations: z.array(
    z.object({
      title: z.string(),
      category: z.string(),
      description: z.string(),
    })
  ).optional(),
  owner_info: z.object({
    user_id: z.string(),
    name: z.string(),
    email: z.string(),
  }).optional(),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
  location: z.string().optional(),
  average_rating: z.number().optional(),
  total_reviews: z.number().optional(),
  booking_policy: z.string().optional(),
  cancellation_policy: z.string().optional(),
  terms_and_conditions: z.string().optional(),
  faqs: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  social_links: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  meta_keywords: z.string().optional(),
  schema_markup: z.string().optional(),
  css_styles: z.string().optional(),
  js_scripts: z.string().optional(),
  custom_fields: z.string().optional(),
  seo_friendly_url: z.string().optional(),
  related_venues: z.array(z.string()).optional(),
  venue_type: z.string().optional(),
  time_zone: z.string().optional(),
  minimum_booking_hours: z.number().optional(),
  maximum_booking_hours: z.number().optional(),
  deposit_amount: z.number().optional(),
  tax_rate: z.number().optional(),
  currency: z.string().optional(),
  payment_gateway: z.string().optional(),
  booking_confirmation_email: z.string().optional(),
  cancellation_email: z.string().optional(),
  thank_you_message: z.string().optional(),
  google_analytics_code: z.string().optional(),
  facebook_pixel_code: z.string().optional(),
  conversion_tracking_code: z.string().optional(),
  recaptcha_code: z.string().optional(),
  custom_code: z.string().optional(),
  layout_template: z.string().optional(),
  page_speed_optimization: z.string().optional(),
  mobile_friendliness: z.string().optional(),
  security_measures: z.string().optional(),
  data_backup_frequency: z.string().optional(),
  disaster_recovery_plan: z.string().optional(),
  customer_support_channels: z.string().optional(),
  customer_support_hours: z.string().optional(),
  customer_support_languages: z.string().optional(),
  training_materials: z.string().optional(),
  user_manuals: z.string().optional(),
  api_documentation: z.string().optional(),
  integration_capabilities: z.string().optional(),
  third_party_integrations: z.string().optional(),
  data_migration_services: z.string().optional(),
  customization_options: z.string().optional(),
  development_services: z.string().optional(),
  maintenance_services: z.string().optional(),
  support_services: z.string().optional(),
  consulting_services: z.string().optional(),
  training_services: z.string().optional(),
  installation_services: z.string().optional(),
  setup_services: z.string().optional(),
  configuration_services: z.string().optional(),
  troubleshooting_services: z.string().optional(),
  performance_monitoring: z.string().optional(),
  security_audits: z.string().optional(),
  vulnerability_assessments: z.string().optional(),
  penetration_testing: z.string().optional(),
  incident_response_plan: z.string().optional(),
  business_continuity_plan: z.string().optional(),
  risk_management_plan: z.string().optional(),
  compliance_standards: z.string().optional(),
  regulatory_requirements: z.string().optional(),
  legal_agreements: z.string().optional(),
  privacy_policy: z.string().optional(),
  terms_of_service: z.string().optional(),
  service_level_agreement: z.string().optional(),
  warranty_information: z.string().optional(),
  intellectual_property_rights: z.string().optional(),
  data_ownership: z.string().optional(),
  data_usage_policy: z.string().optional(),
  data_retention_policy: z.string().optional(),
  data_deletion_policy: z.string().optional(),
  data_security_measures: z.string().optional(),
  data_encryption_methods: z.string().optional(),
  access_control_mechanisms: z.string().optional(),
  authentication_methods: z.string().optional(),
  authorization_protocols: z.string().optional(),
  session_management_techniques: z.string().optional(),
  input_validation_techniques: z.string().optional(),
  output_encoding_methods: z.string().optional(),
  error_handling_procedures: z.string().optional(),
  logging_mechanisms: z.string().optional(),
  monitoring_systems: z.string().optional(),
  alerting_systems: z.string().optional(),
  reporting_tools: z.string().optional(),
  analytics_dashboards: z.string().optional(),
  key_performance_indicators: z.string().optional(),
  return_on_investment: z.string().optional(),
  customer_satisfaction_score: z.string().optional(),
  net_promoter_score: z.string().optional(),
  customer_churn_rate: z.string().optional(),
  customer_lifetime_value: z.string().optional(),
  market_share: z.string().optional(),
  revenue_growth: z.string().optional(),
  profit_margin: z.string().optional(),
  cost_reduction: z.string().optional(),
  operational_efficiency: z.string().optional(),
  process_improvement: z.string().optional(),
  innovation_metrics: z.string().optional(),
  employee_engagement: z.string().optional(),
  talent_retention: z.string().optional(),
  leadership_development: z.string().optional(),
  organizational_culture: z.string().optional(),
  corporate_social_responsibility: z.string().optional(),
  environmental_sustainability: z.string().optional(),
  community_involvement: z.string().optional(),
  ethical_conduct: z.string().optional(),
  legal_compliance: z.string().optional(),
  risk_mitigation: z.string().optional(),
  crisis_management: z.string().optional(),
  reputation_management: z.string().optional(),
  brand_awareness: z.string().optional(),
  customer_loyalty: z.string().optional(),
  competitive_advantage: z.string().optional(),
  strategic_partnerships: z.string().optional(),
  mergers_and_acquisitions: z.string().optional(),
  global_expansion: z.string().optional(),
  new_product_development: z.string().optional(),
  technology_adoption: z.string().optional(),
  digital_transformation: z.string().optional(),
  artificial_intelligence: z.string().optional(),
  machine_learning: z.string().optional(),
  data_science: z.string().optional(),
  cloud_computing: z.string().optional(),
  internet_of_things: z.string().optional(),
  blockchain_technology: z.string().optional(),
  virtual_reality: z.string().optional(),
  augmented_reality: z.string().optional(),
  cybersecurity: z.string().optional(),
  data_privacy: z.string().optional(),
  regulatory_compliance_technology: z.string().optional(),
  financial_technology: z.string().optional(),
  healthcare_technology: z.string().optional(),
  educational_technology: z.string().optional(),
  environmental_technology: z.string().optional(),
  social_impact_technology: z.string().optional(),
  sustainable_development_goals: z.string().optional(),
  impact_investing: z.string().optional(),
  social_entrepreneurship: z.string().optional(),
  nonprofit_management: z.string().optional(),
  philanthropy: z.string().optional(),
  volunteerism: z.string().optional(),
  civic_engagement: z.string().optional(),
  political_activism: z.string().optional(),
  grassroots_movements: z.string().optional(),
  social_justice: z.string().optional(),
  human_rights: z.string().optional(),
  equality_and_diversity: z.string().optional(),
  inclusion_and_belonging: z.string().optional(),
  accessibility_and_universal_design: z.string().optional(),
  environmental_protection: z.string().optional(),
  climate_change_mitigation: z.string().optional(),
  renewable_energy: z.string().optional(),
  sustainable_agriculture: z.string().optional(),
  conservation_of_natural_resources: z.string().optional(),
  waste_reduction_and_recycling: z.string().optional(),
  pollution_prevention: z.string().optional(),
  water_conservation: z.string().optional(),
  air_quality_improvement: z.string().optional(),
  land_use_planning: z.string().optional(),
  urban_development: z.string().optional(),
  rural_development: z.string().optional(),
  infrastructure_development: z.string().optional(),
  transportation_planning: z.string().optional(),
  housing_policy: z.string().optional(),
  education_reform: z.string().optional(),
  healthcare_access: z.string().optional(),
  poverty_reduction: z.string().optional(),
  economic_development: z.string().optional(),
  job_creation: z.string().optional(),
  workforce_development: z.string().optional(),
  entrepreneurship_and_innovation: z.string().optional(),
  small_business_support: z.string().optional(),
  financial_literacy: z.string().optional(),
  consumer_protection: z.string().optional(),
  affordable_housing: z.string().optional(),
  homelessness_prevention: z.string().optional(),
  community_development: z.string().optional(),
  social_services: z.string().optional(),
  public_health: z.string().optional(),
  mental_health: z.string().optional(),
  addiction_treatment: z.string().optional(),
  disease_prevention: z.string().optional(),
  health_education: z.string().optional(),
  nutrition_and_wellness: z.string().optional(),
  fitness_and_exercise: z.string().optional(),
  stress_management: z.string().optional(),
  sleep_hygiene: z.string().optional(),
  mindfulness_and_meditation: z.string().optional(),
  yoga_and_pilates: z.string().optional(),
  tai_chi_and_qigong: z.string().optional(),
  martial_arts: z.string().optional(),
  dance_and_movement: z.string().optional(),
  sports_and_recreation: z.string().optional(),
  outdoor_activities: z.string().optional(),
  nature_therapy: z.string().optional(),
  animal-assisted_therapy: z.string().optional(),
  art_therapy: z.string().optional(),
  music_therapy: z.string().optional(),
  drama_therapy: z.string().optional(),
  play_therapy: z.string().optional(),
  creative_writing_therapy: z.string().optional(),
  bibliotherapy: z.string().optional(),
  poetry_therapy: z.string().optional(),
  journaling_therapy: z.string().optional(),
  narrative_therapy: z.string().optional(),
  cognitive_behavioral_therapy: z.string().optional(),
  dialectical_behavior_therapy: z.string().optional(),
  acceptance_and_commitment_therapy: z.string().optional(),
  mindfulness-based_cognitive_therapy: z.string().optional(),
  positive_psychology: z.string().optional(),
  humanistic_psychology: z.string().optional(),
  existential_psychology: z.string().optional(),
  transpersonal_psychology: z.string().optional(),
  integrative_psychology: z.string().optional(),
  holistic_psychology: z.string().optional(),
  wellness_coaching: z.string().optional(),
  life_coaching: z.string().optional(),
  executive_coaching: z.string().optional(),
  leadership_coaching: z.string().optional(),
  career_coaching: z.string().optional(),
  relationship_coaching: z.string().optional(),
  financial_coaching: z.string().optional(),
  health_coaching: z.string().optional(),
  fitness_coaching: z.string().optional(),
  nutrition_coaching: z.string().optional(),
  stress_management_coaching: z.string().optional(),
  sleep_coaching: z.string().optional(),
  mindfulness_coaching: z.string().optional(),
  meditation_coaching: z.string().optional(),
  yoga_coaching: z.string().optional(),
  tai_chi_coaching: z.string().optional(),
  martial_arts_coaching: z.string().optional(),
  dance_coaching: z.string().optional(),
  sports_coaching: z.string().optional(),
  outdoor_activities_coaching: z.string().optional(),
  nature_therapy_coaching: z.string().optional(),
  animal-assisted_therapy_coaching: z.string().optional(),
  art_therapy_coaching: z.string().optional(),
  music_therapy_coaching: z.string().optional(),
  drama_therapy_coaching: z.string().optional(),
  play_therapy_coaching: z.string().optional(),
  creative_writing_therapy_coaching: z.string().optional(),
  bibliotherapy_coaching: z.string().optional(),
  poetry_therapy_coaching: z.string().optional(),
  journaling_therapy_coaching: z.string().optional(),
  narrative_therapy_coaching: z.string().optional(),
  cognitive_behavioral_therapy_coaching: z.string().optional(),
  dialectical_behavior_therapy_coaching: z.string().optional(),
  acceptance_and_commitment_therapy_coaching: z.string().optional(),
  mindfulness-based_cognitive_therapy_coaching: z.string().optional(),
  positive_psychology_coaching: z.string().optional(),
  humanistic_psychology_coaching: z.string().optional(),
  existential_psychology_coaching: z.string().optional(),
  transpersonal_psychology_coaching: z.string().optional(),
  integrative_psychology_coaching: z.string().optional(),
  holistic_psychology_coaching: z.string().optional(),
  wellness_consulting: z.string().optional(),
  life_consulting: z.string().optional(),
  executive_consulting: z.string().optional(),
  leadership_consulting: z.string().optional(),
  career_consulting: z.string().optional(),
  relationship_consulting: z.string().optional(),
  financial_consulting: z.string().optional(),
  health_consulting: z.string().optional(),
  fitness_consulting: z.string().optional(),
  nutrition_consulting: z.string().optional(),
  stress_management_consulting: z.string().optional(),
  sleep_consulting: z.string().optional(),
  mindfulness_consulting: z.string().optional(),
  meditation_consulting: z.string().optional(),
  yoga_consulting: z.string().optional(),
  tai_chi_consulting: z.string().optional(),
  martial_arts_consulting: z.string().optional(),
  dance_consulting: z.string().optional(),
  sports_consulting: z.string().optional(),
  outdoor_activities_consulting: z.string().optional(),
  nature_therapy_consulting: z.string().optional(),
  animal-assisted_therapy_consulting: z.string().optional(),
  art_therapy_consulting: z.string().optional(),
  music_therapy_consulting: z.string().optional(),
  drama_therapy_consulting: z.string().optional(),
  play_therapy_consulting: z.string().optional(),
  creative_writing_therapy_consulting: z.string().optional(),
  bibliotherapy_consulting: z.string().optional(),
  poetry_therapy_consulting: z.string().optional(),
  journaling_therapy_consulting: z.string().optional(),
  narrative_therapy_consulting: z.string().optional(),
  cognitive
