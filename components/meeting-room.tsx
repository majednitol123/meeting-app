"use client";

import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import { LayoutList, Users } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { EndCallButton } from "./end-call-button";
import { Loader } from "./loader";

type CallLayoutType = "grid" | "speaker-left" | "speaker-right";

export const MeetingRoom = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showParticipants, setShowParticipants] = useState(false);
  const [layout, setLayout] = useState<CallLayoutType>("speaker-left");
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [isSharingActive, setIsSharingActive] = useState(false);

  const { useCallCallingState } = useCallStateHooks();
  const call = useCall();
  const callingState = useCallCallingState();
  const isPersonalRoom = !!searchParams.get("personal");

  // ✅ Handle screen resize/orientation
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // ✅ Detect if someone is sharing their screen (new Stream SDK)
  useEffect(() => {
    if (!call) return;

    const handleUpdate = () => {
      const participants = Array.from(call.state.participants.values());
      const sharing = participants.some(
        (p) => p.getTrack("screen_share")?.isPublished
      );
      setIsSharingActive(sharing);
    };

    call.on("participant_updated", handleUpdate);
    call.on("participant_joined", handleUpdate);
    call.on("participant_left", handleUpdate);
    handleUpdate();

    return () => {
      call.off("participant_updated", handleUpdate);
      call.off("participant_joined", handleUpdate);
      call.off("participant_left", handleUpdate);
    };
  }, [call]);

  // ✅ Auto fullscreen logic
  useEffect(() => {
    const enterFullscreen = async () => {
      if (!document.fullscreenElement && isMobile && (isLandscape || isSharingActive)) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (err) {
          console.warn("Fullscreen request failed:", err);
        }
      }
    };

    const exitFullscreen = async () => {
      if (document.fullscreenElement && (!isMobile || (!isLandscape && !isSharingActive))) {
        try {
          await document.exitFullscreen();
        } catch (err) {
          console.warn("Exit fullscreen failed:", err);
        }
      }
    };

    if (isMobile && (isLandscape || isSharingActive)) enterFullscreen();
    else exitFullscreen();
  }, [isMobile, isLandscape, isSharingActive]);

  if (callingState !== CallingState.JOINED) return <Loader />;

  // ✅ Layout rendering logic
  const CallLayout = () => {
    if (isMobile) {
      return (
        <div
          className={`flex flex-col w-full h-full bg-black transition-all duration-300 ${
            isLandscape ? "justify-center items-center" : ""
          }`}
        >
          <div
            className={`flex ${
              isLandscape || isSharingActive ? "h-full" : "h-[100%]"
            } w-full justify-center items-center bg-black`}
          >
            <SpeakerLayout participantsBarPosition="bottom" />
          </div>

          {!isLandscape && !isSharingActive && (
            <div className="flex h-[0%] w-full bg-[#111] border-t border-gray-800 overflow-x-auto overflow-y-hidden hide-scrollbar">
              <div className="flex flex-nowrap items-center gap-3 p-2 w-max">
                <CallParticipantsList onClose={() => {}} />
              </div>
            </div>
          )}
        </div>
      );
    }

    switch (layout) {
      case "grid":
        return <PaginatedGridLayout />;
      case "speaker-right":
        return <SpeakerLayout participantsBarPosition="left" />;
      default:
        return <SpeakerLayout participantsBarPosition="right" />;
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden pt-4 text-white bg-black">
      <style jsx global>{`
        @media (max-width: 768px) {
          .str-video__participant-list-header,
          .str-video__participant-list-count {
            display: none !important;
          }
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        :-webkit-full-screen {
          background-color: black;
        }
        :-moz-full-screen {
          background-color: black;
        }
        :-ms-fullscreen {
          background-color: black;
        }
        :fullscreen {
          background-color: black;
        }
      `}</style>

      {/* Main video area */}
      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center">
          <CallLayout />
        </div>

        <div
          className={cn("ml-2 hidden h-[calc(100vh_-_86px)]", {
            "show-block": showParticipants && !isMobile,
          })}
        >
          {!isMobile && (
            <CallParticipantsList onClose={() => setShowParticipants(false)} />
          )}
        </div>
      </div>

      {/* Bottom controls */}
      {!isLandscape && !isSharingActive && (
        <div className="fixed bottom-0 flex w-full flex-wrap items-center justify-center gap-5 bg-[#0D1117]/80 backdrop-blur-md py-2">
          <CallControls onLeave={() => router.push("/")} />

          <DropdownMenu>
            <div className="flex items-center">
              <DropdownMenuTrigger
                className="cursor-pointer rounded-2xl bg-[#19232D] px-4 py-2 hover:bg-[#4C535B]"
                title="Call layout"
              >
                <LayoutList size={20} className="text-white" />
              </DropdownMenuTrigger>
            </div>
            <DropdownMenuContent className="border-dark-1 bg-dark-1 text-white">
              {["Grid", "Speaker Left", "Speaker Right"].map((item) => (
                <div key={item}>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() =>
                      setLayout(
                        item.toLowerCase().replace(" ", "-") as CallLayoutType
                      )
                    }
                  >
                    {item}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="border-dark-1" />
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <CallStatsButton />

          {!isMobile && (
            <button
              onClick={() => setShowParticipants((prev) => !prev)}
              title="Show participants"
            >
              <div className="cursor-pointer rounded-2xl bg-[#19232D] px-4 py-2 hover:bg-[#4C535B]">
                <Users size={20} className="text-white" />
              </div>
            </button>
          )}

          {!isPersonalRoom && <EndCallButton />}
        </div>
      )}
    </div>
  );
};
