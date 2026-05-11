-- Create function to add team for new user
create or replace function public.handle_new_user_team()
returns trigger
language plpgsql
security definer
as $$
declare
  team_name text;
begin
  -- Set team name using first_name or default to 'My Team' if null
  team_name := coalesce(NEW.first_name || '''s Team', 'My Team');
  
  -- Insert new team
  insert into public.teams (name, created_by, updated_by)
  values (team_name, NEW.id, NEW.id);
  
  return NEW;
end;
$$;

-- Create trigger to execute function on user insert
create trigger on_user_created
  after insert on public.users
  for each row execute procedure public.handle_new_user_team();
