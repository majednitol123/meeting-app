"use client";

import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
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

  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const isPersonalRoom = !!searchParams.get("personal");

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (callingState !== CallingState.JOINED) return <Loader />;


  const CallLayout = () => {
    // ✅ Mobile layout (70% screen share + 30% participants)
    if (isMobile) {
      return (
        <div className="flex flex-col w-full h-full bg-black">
          {/* Shared screen (70%) */}
          <div className="flex h-[80%] w-full justify-center items-center bg-black">
            <SpeakerLayout participantsBarPosition="bottom" />
          </div>

          {/* Participants (30%) horizontally scrollable */}
          <div className="flex h-[20%] w-full bg-[#111] border-t border-gray-800 overflow-x-auto overflow-y-hidden hide-scrollbar">
            <div className="flex flex-nowrap items-center gap-3 p-2 w-max">
              <CallParticipantsList onClose={() => {}} />
            </div>
          </div>
        </div>
      );
    }

    // ✅ Desktop layout
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
        /* Hide Stream participant header + count on mobile */
        @media (max-width: 768px) {
          .str-video__participant-list-header,
          .str-video__participant-list-count {
            display: none !important;
          }
        }

        /* Hide scrollbars for clean mobile view */
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* Main content */}
      <div className="relative flex size-full items-center justify-center">
        <div className="flex size-full max-w-[1000px] items-center">
          <CallLayout />
        </div>

        {/* Desktop participants sidebar */}
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
      <div className="fixed bottom-0 flex w-full flex-wrap items-center justify-center gap-5 bg-[#0D1117]/80 backdrop-blur-md py-2">
        <CallControls onLeave={() => router.push("/")} />

        {/* Layout switcher */}
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
            {["Grid", "Speaker Left", "Speaker Right"].map((item, i) => (
              <div key={item + "-" + i}>
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

        {/* Show/hide participants (desktop only) */}
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
    </div>
  );
};
